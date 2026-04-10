import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Style → prompt mapping
const stylePrompts = {
  // Anime-ify
  disney: "Transform this photo into Disney/Pixar 3D animation style. Give characters big expressive eyes, smooth skin, vibrant saturated colors, and that signature Pixar lighting. Keep the composition and poses the same but make everything look like a frame from a Pixar movie.",

  ghibli: "Transform this photo into Studio Ghibli hand-drawn anime style. Use soft watercolor-like textures, gentle pastel colors, detailed natural backgrounds with lush greens, and that dreamy Miyazaki atmosphere. Characters should have simple but expressive features.",

  minecraft: "Transform this photo into Minecraft style. Make everything look like it's built from blocky cubes and voxels. Use the iconic pixelated Minecraft texture palette. Characters should look like Minecraft skins. The whole scene should look like a Minecraft world screenshot.",

  waifu: "Transform this photo into Japanese anime waifu style. Use the aesthetic of modern anime with large sparkly eyes, colorful hair highlights, smooth cel-shaded rendering, and a soft romantic atmosphere with pastel tones and lens flare effects.",

  // Game-ify
  gta: "Transform this photo into Grand Theft Auto V loading screen art style. Use that signature GTA brush-stroke illustration look with bold outlines, slightly exaggerated features, warm sunset tones, and the gritty urban aesthetic of Rockstar Games artwork.",

  lego: "Transform this photo into a scene made entirely of Lego bricks and minifigures. Everything should look like real Lego pieces — characters as minifigures with yellow skin and printed faces, environment built from colorful Lego bricks with visible studs on top.",

  fallout: "Transform this photo into Fallout retro-futuristic post-apocalyptic style. Use the 1950s atomic age aesthetic mixed with decay and rust. Add a Pip-Boy green tint, Vault-Tec propaganda poster feel, and that signature Fallout wasteland atmosphere.",

  mario: "Transform this photo into Super Mario Bros Nintendo game style. Make it look like a colorful Mario game world with bright primary colors, cartoon characters, coin blocks, pipes, and that cheerful Nintendo art style. Characters should look like Mario game characters.",

  // Render-ify
  plastic: "Transform this photo to make everything look like it's made of shiny smooth plastic, like toy figurines or vinyl collectibles. Add that glossy plastic sheen, smooth out all textures, and make it look like a high-end designer toy or Funko Pop figure.",

  gumby: "Transform this photo into Gumby-style claymation. Make everything look like it's made of colored clay or plasticine, with visible fingerprint-like textures, slightly wobbly proportions, and that charming stop-motion animation look from classic Gumby cartoons.",

  surreal: "Transform this photo into a surreal 3D render inspired by Salvador Dali. Warp and melt objects, add impossible geometry, dreamlike floating elements, unusual scale relationships, and hyperreal lighting on surreal scenes. Make it look like a high-quality 3D surrealist artwork.",

  metal: "Transform this photo to make everything look like it's sculpted from polished chrome and brushed metal. Add metallic reflections, sharp highlights, and make all surfaces look like gleaming steel or silver sculptures. The whole scene should look like a photorealistic metal sculpture.",
};

// Increase timeout for long AI generations
app.use((req, res, next) => {
  req.setTimeout(120000);
  res.setTimeout(120000);
  next();
});

app.post('/api/slopify', async (req, res) => {
  try {
    const { image, style } = req.body;

    if (!image || !style) {
      return res.status(400).json({ error: 'Missing image or style' });
    }

    const basePrompt = stylePrompts[style];
    if (!basePrompt) {
      return res.status(400).json({ error: `Unknown style: ${style}` });
    }

    // Prefix to help avoid safety filter rejections
    const prompt = `Create a fun, family-friendly artistic illustration. ${basePrompt} Keep the result appropriate for all ages.`;

    console.log(`[Photoslop] Slopifying with style: ${style}`);

    // Convert base64 data URL to a File object for the OpenAI SDK
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const imageFile = new File([imageBuffer], 'image.png', { type: 'image/png' });

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: prompt,
      size: '1024x1024',
    });

    console.log(`[Photoslop] Style ${style} complete!`);

    const result = response.data[0];
    if (result.b64_json) {
      res.json({ image: `data:image/png;base64,${result.b64_json}` });
    } else if (result.url) {
      res.json({ image: result.url });
    } else {
      throw new Error('No image data in response');
    }
  } catch (err) {
    console.error('[Photoslop] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Photoslop] Server running at http://localhost:${PORT}`);
  console.log(`[Photoslop] OpenAI API key: ${process.env.OPENAI_API_KEY ? '✓ configured' : '✗ MISSING — set OPENAI_API_KEY'}`);
});
