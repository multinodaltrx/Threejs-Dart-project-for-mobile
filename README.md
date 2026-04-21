# PSI Volumetric Energy Orb (Iteration 1)

**Client:** PSI  
**Agency:** Xeleration  
**Project:** Mobile Application 3D Asset Integration  

---

## 📖 Overview
This repository contains the First Iteration of the 3D Volumetric Energy Orb designed for the PSI mobile application. 

To ensure maximum performance and a seamless native experience on mobile devices, this effect **does not rely on a WebView**. Instead, the core visual logic has been written in raw GLSL (graphics card language). This allows the Flutter team to render the 3D asset natively using the device's GPU.

---

## 🏗️ Repository Architecture

This repository is split into two distinct environments to separate the web-based testing sandbox from the production mobile assets.

```text
psi-orb-fx/
├── mobile-assets/      # 👈 FOR FLUTTER DEVELOPERS
│   ├── orb_vertex.glsl # Core geometry math
│   ├── orb_frag.glsl   # Volumetric raymarching math
│   └── presets.json    # Uniform configurations (Colors, Density, Speed)
├── web-preview/        # 👈 FOR QA & WEB TESTING
│   ├── index.html      
│   ├── main.js         
│   └── package.json    
└── README.md
