# The Rustler's Code — source code

This is the source for the game that lives next door in `games/rustlers-code/`
(that folder is the ready-to-play build; this one is the code it was built from).

**The game:** a stylised low-poly, third-person Wild West adventure for the
browser. You lead a small gang of good-hearted outlaws against Cornelius Vane,
a corrupt railroad baron. The hero is a legendary sharpshooter who never points
iron at anything living — the game enforces it. Built with Three.js + Vite in
plain JavaScript. Family-friendly (E10+), entirely free assets.

## Building it

You need Node.js installed. Then, in this folder:

```
npm install
npm run build
```

That creates a `dist/` folder — its contents are what goes in
`games/rustlers-code/`. For local development use `npm run dev` instead.

## Note

The source of truth for this game is the owner's local "The Rustler's Code"
project; this folder is a snapshot copied in alongside the build. If the game
gets updated, both this folder and `games/rustlers-code/` should be refreshed
together.
