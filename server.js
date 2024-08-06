const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors({
  origin:["https://og-image-gurshaan.vercel.app","http://localhost:5173"]
}));

// Ensure the public directory exists
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

app.use(express.json());

const handleGenerateLink = () => {
  if (ogImageUrl) {
    // Generate a unique identifier (you might want to use a more robust method in production)
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    // Construct the full URL to your image
    const fullUrl = `${window.location.origin}/og-image/${uniqueId}`;
    setGeneratedLink(fullUrl);
  }
};

app.post("/generate-og-image", upload.single("image"), async (req, res) => {
  try {
    const { title, content } = req.body;
    const uploadedImage = req.file ? req.file.path : null;

    // Generate the OG image
    const ogImageBuffer = await generateOgImage(title, content, uploadedImage);

    // Save the image to a file and return the URL
    const imageName = `og-${Date.now()}.png`;
    const imagePath = path.join(publicDir, imageName);
    fs.writeFileSync(imagePath, ogImageBuffer);

    res.json({ imageUrl: `/public/${imageName}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate OG image" });
  }
});

async function generateOgImage(title, content, uploadedImage) {
  // Create a white background
  const background = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  // Generate SVG overlay with text
  const textSvg = `
    <svg width="1200" height="630">
      <style>
        .title { font: bold 48px sans-serif; fill: #333333; }
        .content { font: 28px sans-serif; fill: #666666; }
      </style>
      <text x="50" y="180" class="title">
        ${title.length > 30 ? title.substring(0, 27) + '...' : title}
      </text>
      <text x="50" y="240" class="content">
        ${content.length > 60 ? content.substring(0,57) + '...' :content}
      </text>
    </svg>
  `;

  // Composite the text onto the background
  let image = await sharp(background)
    .composite([{ input: Buffer.from(textSvg), top: 0, left: 0 }])
    .toBuffer();

  // Add logos
  const logo1 = await sharp('./logo.png').resize(50, 50).toBuffer();
  const logo2 = await sharp('./altlogo.png').resize(125, 50).toBuffer();

  image = await sharp(image)
    .composite([
      { input: logo1, top: 20, left: 20 },
      { input: logo2, top: 20, left: 1050 } 
    ])
    .toBuffer();

  // If an image was uploaded, resize and composite it at the bottom
  if (uploadedImage) {
    const uploadedImageBuffer = await sharp(uploadedImage)
      .resize(1100, 300, { fit: 'inside' })
      .toBuffer();

    image = await sharp(image)
      .composite([{ input: uploadedImageBuffer, top: 350, left: 50 }])
      .toBuffer();
  }

  return image;
}

app.use("/public", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
