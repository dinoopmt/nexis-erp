# How to Add Custom Icon to Electron App

## Quick Setup

### 1. Get Your Icon
You need an icon file in one of these formats:
- **`.ico`** (Windows) - 256x256 pixels recommended
- **`.png`** (Will be converted to .ico automatically)

### 2. Place Icon in Assets
Copy your icon file to: `d:\NEXIS-ERP\client\assets\icon.ico`

Example:
```
d:\NEXIS-ERP\client\assets\
├── icon.ico          ← Place your icon here
```

### 3. Rebuild
Run:
```bash
npm run build:electron
```

The icon will automatically be used in:
- ✅ Exe file (Windows File Explorer)
- ✅ Taskbar
- ✅ Desktop shortcut
- ✅ NSIS installer

## Convert PNG to ICO

### Option 1: Online (Easy)
1. Go to: https://convertio.co/png-ico/
2. Upload your PNG file
3. Download the .ico file
4. Save as `assets/icon.ico`

### Option 2: Using ImageMagick (Command Line)
```bash
# If you have ImageMagick installed
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

### Option 3: Using Python
```python
from PIL import Image

# Open PNG and convert to ICO
img = Image.open('icon.png')
img.save('icon.ico')
```

## Best Practices

- **Size**: 256x256 pixels minimum
- **Format**: ICO with multiple sizes embedded (256, 128, 96, 64, 48, 32, 16)
- **Colors**: 24-bit or 32-bit with transparency
- **Design**: Simple, recognizable logo works best

## Icon Assets Structure

```
assets/
├── icon.ico              ← Used for Windows exe/installer
└── icon.png             ← Optional: Source file
```

## Verify It Works

1. Rebuild: `npm run build:electron`
2. Check: `dist-electron/NEXIS ERP-0.0.0-portable.exe`
3. Right-click → Properties → Details
4. You should see your custom icon

## Troubleshooting

**Icon not showing?**
- Ensure file is named exactly: `icon.ico`
- Ensure it's in: `assets/` directory
- Rebuild: `npm run build:electron`
- Clear old build: `rm -r dist-electron` before rebuilding

**Icon looks blurry?**
- Use higher resolution (512x512 or larger)
- Ensure transparency is correct (PNG format first)
- Convert using proper tool (ImageMagick recommended)

**Multiple icon sizes?**
Electron-builder can create ICO with multiple sizes:
```bash
# Use this to convert PNG to multi-size ICO:
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

## Next Steps

1. Prepare your icon (256x256 PNG or ICO)
2. Copy to `assets/icon.ico`
3. Run: `npm run build:electron`
4. Test the exe - you should see your custom icon!
