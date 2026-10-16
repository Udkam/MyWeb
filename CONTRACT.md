# SpriteLab implementation contract

Buildless static source in `src/`; native ES modules. Chinese UI, no external runtime network. Canonical destination after QA: `E:/Proj/Active/MyWeb/spritelab`. Work in this staging directory only until owner copies verified sources. Do not touch other projects. User approved this product and public Vercel deployment.

## Project schema / pixel convention

Plain JSON-compatible data (use ordinary arrays for pixels):

```js
{
 format: 'spritelab', version: 1, name: '森林信使', width: 32, height: 32,
 layers: [{ id:'layer-1', name:'角色', visible:true, opacity:1 }], // order bottom to top
 clips: [{ id:'clip-1', name:'待机', frames:[
   { id:'frame-1', duration:140, cells: [[/* width*height uint32 RGBA */]] }
 ]}]
}
```

Colors are unsigned packed `0xRRGGBBAA`. `0` is transparent. Each frame has one `cells` pixel array per global layer. IDs must be unique in their relevant collection. Duration 30–2000 ms. Limits: dimensions 1–128, max 4 layers, max 8 clips, max 64 frames per clip; total frame*layer*width*height <= 2,097,152 pixels. User-facing blank sizes: 16/32/64. Import may be rectangular. No code or HTML execution in project input. Validate types, counts, all pixel values before replacing a project.

## core.js (agent core owner)

Exports:

- `LIMITS`, `uid(prefix)`, `cloneProject(project)`
- `createProject(width=32,height=32,name='未命名作品')`
- `validateProject(value)` returns a normalized deeply copied project or throws Chinese Error (strict no silent truncation).
- `hexToPixel(hex)` accepts #RRGGBB; `pixelToHex(pixel)` returns #rrggbb; `rgba(pixel)` returns [r,g,b,a].
- `compositeFrame(project,frame)` returns ordinary packed RGBA array with global layer visibility/opacity applied; proper alpha over.
- `paintLine(cells,w,h,x0,y0,x1,y1,color,size=1,mirror=false)` mutates pixels clipped to bounds.
- `floodFill(cells,w,h,x,y,color)` mutates connected equal pixel region.
- `drawShape(cells,w,h,x0,y0,x1,y1,color,kind)` outline rect or line; kind 'rect'|'line'.
- `flipPixels(cells,w,h,axis)` returns new array; axis 'x'|'y'.
- `movePixels(cells,w,h,dx,dy,selection=null)` returns new array; selection optional `{x,y,w,h}`, move selected pixels with clipping, clear original selection and overlay nonzero pixels at destination.
- `resizeProject(project,w,h)` returns resized project centered without scaling, checks budget.
- `createHistory(limit=40,byteLimit=32*1024*1024)` returns `{push(project),undo(current),redo(current),clear(),get canUndo(),get canRedo()}`; undo/redo returns project or null, push called before mutation, cap memory appropriately.

## io.js (agent IO owner)

Imports core only if necessary. Exports:

- `projectBlob(project)` JSON Blob; `readProjectFile(file)` async validated project, cap file size.
- `loadPNG(file)` async returns {width,height,pixels}; packed array; reject non PNG or oversized source, preserve alpha. Does not replace project.
- `projectFromSheet(image,{frameWidth,frameHeight,columns,rows,name,duration})` returns project splitting exact regular grid left→right top→bottom; all cells covered; no scaling.
- `frameCanvas(project,frame,scale=1)` canvas with composite; `pngBlob(canvas)` async Blob.
- `sheetExport(project,clipIndex,{columns=0,scale=1}={})` async `{blob,metadata}`; metadata includes rectangles, exact durations and scale; zero columns auto sqrt, transparent padding.
- `framesZip(project,clipIndex)` async ZIP Blob with PNGs + timing.json; use reputable vendored fflate if available, ensure license.
- `downloadBlob(blob,name)` download + revoke url.
- `saveLocal(project)` async IndexedDB saved plus previous copy if practical; `loadLocal()` async project|null; storage errors must propagate; `clearLocal()` if needed.

## stage.js + templates.js (agent stage owner)

- `createStage(canvas)` returns `{setProject(project),setClip(index),setPlaying(bool),setSpeed(number),setMode('preview'|'run'),setBackground('studio'|'forest'|'night'),setScale(number),setOnFrame(fn),step(delta=1),setFrame(index),jump(),move(direction),dispose()}`. setProject references project (no copy), resets only if frame invalid; setClip resets time/frame. callbacks `fn(frameIndex)`; editing selected frame sync via setFrame. Canvas CSS image-rendering pixelated; backing buffer max 640x360, nearest-neighbor. Actual frame durations honored speed multiplier .25..2. Clear stage guidance and simple contextual platforms/decor; sprite bottom anchored to avoid frame movement. `move(-1|0|1)` touchbutton, keyboard left/right and A/D controlled by main to avoid textinputs. `jump` real short ballistic preview, stage physics not editorengine promise. Pause on visibility hidden and reducedmotion initial state (main), no accumulating RAF when stopped. Stage may use sprite alpha bounds for foot anchor but consistent baseline. show ground/shadow distinctly but don't obscure pixels. Own original procedural sample art acceptable (editable example content, not claimed sourced assets).
- `templates.js`: `getTemplates()` returns [{id,name,description,thumbnailProject?}] and `makeTemplate(id)` returns project. Need 3 polished original editable starter examples at 32x32 (forest courier 4 walkframes+2 idleframes, ember/slime bounce4frames, blank via createProject handled main). IDs 'courier','slime','spark'. They are lesson/sample art, no downloaded copyrighted sprites. Multi clip names Chinese where possible. Strong clean pixel art, readable small palette and alpha transparency. Include provenance note.

## Main (root owner)

index.html styles.css app.js; owns docs/build/deploy. Agent modules must not modify these. Main handles selected clip/frame/layer, pointer drawing incl line interpolation, tool shortcuts, history transactions, frame/layer/clip CRUD, file dialogs, export, and save status. Changes invalidating other layers/frames update all. File replacement shows local app confirmation (normal UI not tool approval). Local autosave debounce, catch errors honestly. No fake collaborative or server state. Live exports must use edited data.
