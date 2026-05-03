// ═══════════════════════════════════════════════════════
// SPRITES
// ═══════════════════════════════════════════════════════
var sonicImgOk = false;
var superSonicImgOk = false;
var shadowImgOk = false;
var superShadowImgOk = false;
var silverImgOk = false;
var superSilverImgOk = false;
var knucklesImgOk = false;
var superKnucklesImgOk = false;

var sonicImg = new Image();
sonicImg.onload = function() { sonicImgOk = true; };
sonicImg.onerror = function() { console.error("sonicImg FAILED to load"); };
sonicImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8IS0tIEJvZHkgLS0+CiAgPGNpcmNsZSBjeD0iMzIiIGN5PSIzNCIgcj0iMTYiIGZpbGw9IiMxYTRmY2MiLz4KICA8IS0tIFF1aWxscyAtLT4KICA8cG9seWdvbiBwb2ludHM9IjIwLDIwIDgsNiAxOCwyNCIgZmlsbD0iIzBkMzA4OCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTYsMjYgMiwxNiAxNCwzMCIgZmlsbD0iIzBkMzA4OCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTQsMzIgMCwyNiAxMiwzNiIgZmlsbD0iIzBkMzA4OCIvPgogIDwhLS0gQmVsbHkvbXV6emxlIC0tPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjM2IiByeD0iMTAiIHJ5PSI4IiBmaWxsPSIjZjViMDcwIi8+CiAgPCEtLSBFeWUgd2hpdGUgLS0+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iMjgiIHJ4PSI3IiByeT0iOCIgZmlsbD0id2hpdGUiLz4KICA8IS0tIElyaXMgLS0+CiAgPGNpcmNsZSBjeD0iNDAiIGN5PSIyOCIgcj0iNCIgZmlsbD0iIzExNjYxMSIvPgogIDwhLS0gUHVwaWwgLS0+CiAgPGNpcmNsZSBjeD0iNDEiIGN5PSIyNyIgcj0iMiIgZmlsbD0iYmxhY2siLz4KICA8IS0tIEV5ZSBzaGluZSAtLT4KICA8Y2lyY2xlIGN4PSIzOCIgY3k9IjI2IiByPSIxLjUiIGZpbGw9IndoaXRlIi8+CiAgPCEtLSBOb3NlIC0tPgogIDxjaXJjbGUgY3g9IjQ4IiBjeT0iMzIiIHI9IjIiIGZpbGw9IiMxMTEiLz4KICA8IS0tIE1vdXRoIC0tPgogIDxwYXRoIGQ9Ik00MiwzOCBRNDYsNDIgNDIsNDIiIHN0cm9rZT0iIzExMSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+CiAgPCEtLSBMZWZ0IHNob2UgLS0+CiAgPGVsbGlwc2UgY3g9IjI2IiBjeT0iNTQiIHJ4PSI4IiByeT0iNCIgZmlsbD0iI2NjMjIyMiIvPgogIDxlbGxpcHNlIGN4PSIyNiIgY3k9IjUyIiByeD0iNiIgcnk9IjIiIGZpbGw9IndoaXRlIi8+CiAgPCEtLSBSaWdodCBzaG9lIC0tPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjU0IiByeD0iOCIgcnk9IjQiIGZpbGw9IiNjYzIyMjIiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSI1MiIgcng9IjYiIHJ5PSIyIiBmaWxsPSJ3aGl0ZSIvPgogIDwhLS0gTGVncyAtLT4KICA8cmVjdCB4PSIyNCIgeT0iNDYiIHdpZHRoPSI1IiBoZWlnaHQ9IjYiIGZpbGw9IiMxYTRmY2MiLz4KICA8cmVjdCB4PSIzNSIgeT0iNDYiIHdpZHRoPSI1IiBoZWlnaHQ9IjYiIGZpbGw9IiMxYTRmY2MiLz4KICA8IS0tIEVhciAtLT4KICA8cG9seWdvbiBwb2ludHM9IjI4LDE4IDMyLDggMzYsMTgiIGZpbGw9IiMxYTRmY2MiLz4KICA8cG9seWdvbiBwb2ludHM9IjMwLDE4IDMyLDEyIDM0LDE4IiBmaWxsPSIjZjViMDcwIi8+Cjwvc3ZnPgo=';

var superSonicImg = new Image();
superSonicImg.onload = function() { superSonicImgOk = true; };
superSonicImg.onerror = function() { console.error("superSonicImg FAILED to load"); };
superSonicImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8IS0tIEF1cmEgZ2xvdyAtLT4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjM0IiByPSIzMCIgZmlsbD0idXJsKCNhdXJhKSIgb3BhY2l0eT0iMC40Ii8+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImF1cmEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZkZDAwIiBzdG9wLW9wYWNpdHk9IjAuNiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmRkMDAiIHN0b3Atb3BhY2l0eT0iMCIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICA8L2RlZnM+CiAgPCEtLSBCb2R5IC0tPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzQiIHI9IjE2IiBmaWxsPSIjZjVkMDIwIi8+CiAgPCEtLSBRdWlsbHMgKHVwd2FyZCBmb3IgU3VwZXIpIC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjIsMjAgMTAsMiAyMCwyMiIgZmlsbD0iI2U4YTgwMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsMjIgNCw4IDE2LDI2IiBmaWxsPSIjZThhODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyNiwxNiAxOCwwIDI2LDIwIiBmaWxsPSIjZThhODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIxNiwyOCAwLDE4IDE0LDMyIiBmaWxsPSIjZThhODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIxNCwzNCAtMiwyOCAxMiwzOCIgZmlsbD0iI2U4YTgwMCIvPgogIDwhLS0gQmVsbHkvbXV6emxlIC0tPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjM2IiByeD0iMTAiIHJ5PSI4IiBmaWxsPSIjZjViMDcwIi8+CiAgPCEtLSBFeWUgd2hpdGUgLS0+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iMjgiIHJ4PSI3IiByeT0iOCIgZmlsbD0id2hpdGUiLz4KICA8IS0tIElyaXMgKHJlZCBmb3IgU3VwZXIpIC0tPgogIDxjaXJjbGUgY3g9IjQwIiBjeT0iMjgiIHI9IjQiIGZpbGw9IiNmZjIyMDAiLz4KICA8IS0tIFB1cGlsIC0tPgogIDxjaXJjbGUgY3g9IjQxIiBjeT0iMjciIHI9IjIiIGZpbGw9ImJsYWNrIi8+CiAgPCEtLSBFeWUgc2hpbmUgLS0+CiAgPGNpcmNsZSBjeD0iMzgiIGN5PSIyNiIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIvPgogIDwhLS0gTm9zZSAtLT4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjMyIiByPSIyIiBmaWxsPSIjMTExIi8+CiAgPCEtLSBNb3V0aCAtLT4KICA8cGF0aCBkPSJNNDIsMzggUTQ2LDQyIDQyLDQyIiBzdHJva2U9IiMxMTEiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPgogIDwhLS0gTGVmdCBzaG9lIC0tPgogIDxlbGxpcHNlIGN4PSIyNiIgY3k9IjU0IiByeD0iOCIgcnk9IjQiIGZpbGw9IiNjYzIyMjIiLz4KICA8ZWxsaXBzZSBjeD0iMjYiIGN5PSI1MiIgcng9IjYiIHJ5PSIyIiBmaWxsPSJ3aGl0ZSIvPgogIDwhLS0gUmlnaHQgc2hvZSAtLT4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSI1NCIgcng9IjgiIHJ5PSI0IiBmaWxsPSIjY2MyMjIyIi8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iNTIiIHJ4PSI2IiByeT0iMiIgZmlsbD0id2hpdGUiLz4KICA8IS0tIExlZ3MgLS0+CiAgPHJlY3QgeD0iMjQiIHk9IjQ2IiB3aWR0aD0iNSIgaGVpZ2h0PSI2IiBmaWxsPSIjZjVkMDIwIi8+CiAgPHJlY3QgeD0iMzUiIHk9IjQ2IiB3aWR0aD0iNSIgaGVpZ2h0PSI2IiBmaWxsPSIjZjVkMDIwIi8+CiAgPCEtLSBFYXIgLS0+CiAgPHBvbHlnb24gcG9pbnRzPSIyOCwxOCAzMiw4IDM2LDE4IiBmaWxsPSIjZjVkMDIwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIzMCwxOCAzMiwxMiAzNCwxOCIgZmlsbD0iI2Y1YjA3MCIvPgo8L3N2Zz4K';

// Shadow the Hedgehog (black body, red streaks, red eyes)
var shadowImg = new Image();
shadowImg.onload = function() { shadowImgOk = true; };
shadowImg.onerror = function() { console.error("shadowImg FAILED to load"); };
shadowImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjM0IiByPSIxNiIgZmlsbD0iIzFhMWEyZSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMjAsMjAgOCw2IDE4LDI0IiBmaWxsPSIjMGQwZDE4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIxNiwyNiAyLDE2IDE0LDMwIiBmaWxsPSIjMGQwZDE4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIxNCwzMiAwLDI2IDEyLDM2IiBmaWxsPSIjMGQwZDE4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIxOSwyMSAxMCw5IDE4LDIzIiBmaWxsPSIjY2MwMDAwIiBvcGFjaXR5PSIwLjciLz4KICA8cG9seWdvbiBwb2ludHM9IjE1LDI3IDQsMTkgMTQsMjkiIGZpbGw9IiNjYzAwMDAiIG9wYWNpdHk9IjAuNyIvPgogIDxlbGxpcHNlIGN4PSIzMCIgY3k9IjQwIiByeD0iNSIgcnk9IjMiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjg1Ii8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iMzYiIHJ4PSIxMCIgcnk9IjgiIGZpbGw9IiNmNWIwNzAiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSIyOCIgcng9IjciIHJ5PSI4IiBmaWxsPSJ3aGl0ZSIvPgogIDxjaXJjbGUgY3g9IjQwIiBjeT0iMjgiIHI9IjQiIGZpbGw9IiNjYzAwMDAiLz4KICA8Y2lyY2xlIGN4PSI0MSIgY3k9IjI3IiByPSIyIiBmaWxsPSJibGFjayIvPgogIDxjaXJjbGUgY3g9IjM4IiBjeT0iMjYiIHI9IjEuNSIgZmlsbD0id2hpdGUiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjMyIiByPSIyIiBmaWxsPSIjMTExIi8+CiAgPHBhdGggZD0iTTQyLDM4IFE0Niw0MiA0Miw0MiIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz4KICA8ZWxsaXBzZSBjeD0iMjYiIGN5PSI1NCIgcng9IjgiIHJ5PSI0IiBmaWxsPSIjNDQ0Ii8+CiAgPGVsbGlwc2UgY3g9IjI2IiBjeT0iNTIiIHJ4PSI2IiByeT0iMiIgZmlsbD0iI2NjMjIyMiIvPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjU0IiByeD0iOCIgcnk9IjQiIGZpbGw9IiM0NDQiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSI1MiIgcng9IjYiIHJ5PSIyIiBmaWxsPSIjY2MyMjIyIi8+CiAgPGVsbGlwc2UgY3g9IjI2IiBjeT0iNDkiIHJ4PSI0IiByeT0iMS4yIiBmaWxsPSIjZjVjNTE4Ii8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iNDkiIHJ4PSI0IiByeT0iMS4yIiBmaWxsPSIjZjVjNTE4Ii8+CiAgPHJlY3QgeD0iMjQiIHk9IjQ2IiB3aWR0aD0iNSIgaGVpZ2h0PSI2IiBmaWxsPSIjMWExYTJlIi8+CiAgPHJlY3QgeD0iMzUiIHk9IjQ2IiB3aWR0aD0iNSIgaGVpZ2h0PSI2IiBmaWxsPSIjMWExYTJlIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyOCwxOCAzMiw4IDM2LDE4IiBmaWxsPSIjMWExYTJlIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIzMCwxOCAzMiwxMiAzNCwxOCIgZmlsbD0iI2Y1YjA3MCIvPgo8L3N2Zz4K';

// Super Shadow (golden body, red streaks, gold aura)
var superShadowImg = new Image();
superShadowImg.onload = function() { superShadowImgOk = true; };
superShadowImg.onerror = function() { console.error("superShadowImg FAILED to load"); };
superShadowImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjM0IiByPSIzMCIgZmlsbD0idXJsKCNzc0EpIiBvcGFjaXR5PSIwLjQiLz4KICA8ZGVmcz4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0ic3NBIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZGQwMCIgc3RvcC1vcGFjaXR5PSIwLjYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmZkZDAwIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzQiIHI9IjE2IiBmaWxsPSIjZjVlMDZkIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyMiwyMCAxMCwyIDIwLDIyIiBmaWxsPSIjZDRhODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIxOCwyMiA0LDggMTYsMjYiIGZpbGw9IiNkNGE4MDAiLz4KICA8cG9seWdvbiBwb2ludHM9IjI2LDE2IDE4LDAgMjYsMjAiIGZpbGw9IiNkNGE4MDAiLz4KICA8cG9seWdvbiBwb2ludHM9IjE2LDI4IDAsMTggMTQsMzIiIGZpbGw9IiNkNGE4MDAiLz4KICA8cG9seWdvbiBwb2ludHM9IjE0LDM0IC0yLDI4IDEyLDM4IiBmaWxsPSIjZDRhODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyMSwyMSAxMiw1IDIwLDIyIiBmaWxsPSIjY2MwMDAwIiBvcGFjaXR5PSIwLjYiLz4KICA8cG9seWdvbiBwb2ludHM9IjE3LDIzIDYsMTEgMTYsMjUiIGZpbGw9IiNjYzAwMDAiIG9wYWNpdHk9IjAuNiIvPgogIDxlbGxpcHNlIGN4PSIzMCIgY3k9IjQwIiByeD0iNSIgcnk9IjMiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjg1Ii8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iMzYiIHJ4PSIxMCIgcnk9IjgiIGZpbGw9IiNmNWIwNzAiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSIyOCIgcng9IjciIHJ5PSI4IiBmaWxsPSJ3aGl0ZSIvPgogIDxjaXJjbGUgY3g9IjQwIiBjeT0iMjgiIHI9IjQiIGZpbGw9IiNmZjIyMDAiLz4KICA8Y2lyY2xlIGN4PSI0MSIgY3k9IjI3IiByPSIyIiBmaWxsPSJibGFjayIvPgogIDxjaXJjbGUgY3g9IjM4IiBjeT0iMjYiIHI9IjEuNSIgZmlsbD0id2hpdGUiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjMyIiByPSIyIiBmaWxsPSIjMTExIi8+CiAgPHBhdGggZD0iTTQyLDM4IFE0Niw0MiA0Miw0MiIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz4KICA8ZWxsaXBzZSBjeD0iMjYiIGN5PSI1NCIgcng9IjgiIHJ5PSI0IiBmaWxsPSIjNDQ0Ii8+CiAgPGVsbGlwc2UgY3g9IjI2IiBjeT0iNTIiIHJ4PSI2IiByeT0iMiIgZmlsbD0iI2NjMjIyMiIvPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjU0IiByeD0iOCIgcnk9IjQiIGZpbGw9IiM0NDQiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSI1MiIgcng9IjYiIHJ5PSIyIiBmaWxsPSIjY2MyMjIyIi8+CiAgPGVsbGlwc2UgY3g9IjI2IiBjeT0iNDkiIHJ4PSI0IiByeT0iMS4yIiBmaWxsPSIjZjVjNTE4Ii8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iNDkiIHJ4PSI0IiByeT0iMS4yIiBmaWxsPSIjZjVjNTE4Ii8+CiAgPHJlY3QgeD0iMjQiIHk9IjQ2IiB3aWR0aD0iNSIgaGVpZ2h0PSI2IiBmaWxsPSIjZjVlMDZkIi8+CiAgPHJlY3QgeD0iMzUiIHk9IjQ2IiB3aWR0aD0iNSIgaGVpZ2h0PSI2IiBmaWxsPSIjZjVlMDZkIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyOCwxOCAzMiw4IDM2LDE4IiBmaWxsPSIjZjVlMDZkIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIzMCwxOCAzMiwxMiAzNCwxOCIgZmlsbD0iI2Y1YjA3MCIvPgo8L3N2Zz4K';

// Silver the Hedgehog (silver-gray body, golden eyes, teal boots)
var silverImg = new Image();
silverImg.onload = function() { silverImgOk = true; };
silverImg.onerror = function() { console.error("silverImg FAILED to load"); };
silverImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjM0IiByPSIxNiIgZmlsbD0iI2I4YmNjOCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMjIsMTggMTgsMiAyNCwyMCIgZmlsbD0iI2EwYTRiMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMjgsMTQgMjYsMCAzMCwxNiIgZmlsbD0iI2EwYTRiMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMzQsMTQgMzYsMCAzNiwxNiIgZmlsbD0iI2EwYTRiMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsMjQgNCwxNCAxNiwyOCIgZmlsbD0iI2EwYTRiMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTYsMzAgMiwyNCAxNCwzNCIgZmlsbD0iI2EwYTRiMCIvPgogIDxlbGxpcHNlIGN4PSIzMCIgY3k9IjQwIiByeD0iNSIgcnk9IjMiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjg1Ii8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iMzYiIHJ4PSIxMCIgcnk9IjgiIGZpbGw9IiNmNWMyOGEiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSIyOCIgcng9IjciIHJ5PSI4IiBmaWxsPSJ3aGl0ZSIvPgogIDxjaXJjbGUgY3g9IjQwIiBjeT0iMjgiIHI9IjQiIGZpbGw9IiNkYWE1MjAiLz4KICA8Y2lyY2xlIGN4PSI0MSIgY3k9IjI3IiByPSIyIiBmaWxsPSJibGFjayIvPgogIDxjaXJjbGUgY3g9IjM4IiBjeT0iMjYiIHI9IjEuNSIgZmlsbD0id2hpdGUiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjMyIiByPSIyIiBmaWxsPSIjMTExIi8+CiAgPHBhdGggZD0iTTQyLDM4IFE0Niw0MiA0Miw0MiIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz4KICA8ZWxsaXBzZSBjeD0iMjYiIGN5PSI1NCIgcng9IjgiIHJ5PSI0IiBmaWxsPSIjMDA4YjhiIi8+CiAgPGVsbGlwc2UgY3g9IjI2IiBjeT0iNTIiIHJ4PSI2IiByeT0iMiIgZmlsbD0iIzAwY2VkMSIvPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjU0IiByeD0iOCIgcnk9IjQiIGZpbGw9IiMwMDhiOGIiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSI1MiIgcng9IjYiIHJ5PSIyIiBmaWxsPSIjMDBjZWQxIi8+CiAgPGVsbGlwc2UgY3g9IjI2IiBjeT0iNDkiIHJ4PSI0IiByeT0iMS4yIiBmaWxsPSIjZmZkNzAwIi8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iNDkiIHJ4PSI0IiByeT0iMS4yIiBmaWxsPSIjZmZkNzAwIi8+CiAgPHJlY3QgeD0iMjQiIHk9IjQ2IiB3aWR0aD0iNSIgaGVpZ2h0PSI2IiBmaWxsPSIjYjhiY2M4Ii8+CiAgPHJlY3QgeD0iMzUiIHk9IjQ2IiB3aWR0aD0iNSIgaGVpZ2h0PSI2IiBmaWxsPSIjYjhiY2M4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIyOCwxOCAzMiw4IDM2LDE4IiBmaWxsPSIjYjhiY2M4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIzMCwxOCAzMiwxMiAzNCwxOCIgZmlsbD0iI2Y1YzI4YSIvPgo8L3N2Zz4K';

// Super Silver (golden body, red eyes, gold aura)
var superSilverImg = new Image();
superSilverImg.onload = function() { superSilverImgOk = true; };
superSilverImg.onerror = function() { console.error("superSilverImg FAILED to load"); };
superSilverImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjM0IiByPSIzMCIgZmlsbD0idXJsKCNzdkEpIiBvcGFjaXR5PSIwLjQiLz4KICA8ZGVmcz4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0ic3ZBIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZGQwMCIgc3RvcC1vcGFjaXR5PSIwLjYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmZkZDAwIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzQiIHI9IjE2IiBmaWxsPSIjZmZkNzAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyMiwxOCAxOCwyIDI0LDIwIiBmaWxsPSIjZThiODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIyOCwxNCAyNiwwIDMwLDE2IiBmaWxsPSIjZThiODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIzNCwxNCAzNiwwIDM2LDE2IiBmaWxsPSIjZThiODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIxOCwyNCA0LDE0IDE2LDI4IiBmaWxsPSIjZThiODAwIi8+CiAgPHBvbHlnb24gcG9pbnRzPSIxNiwzMCAyLDI0IDE0LDM0IiBmaWxsPSIjZThiODAwIi8+CiAgPGVsbGlwc2UgY3g9IjMwIiBjeT0iNDAiIHJ4PSI1IiByeT0iMyIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuODUiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSIzNiIgcng9IjEwIiByeT0iOCIgZmlsbD0iI2Y1YzI4YSIvPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjI4IiByeD0iNyIgcnk9IjgiIGZpbGw9IndoaXRlIi8+CiAgPGNpcmNsZSBjeD0iNDAiIGN5PSIyOCIgcj0iNCIgZmlsbD0iI2NjMDAwMCIvPgogIDxjaXJjbGUgY3g9IjQxIiBjeT0iMjciIHI9IjIiIGZpbGw9ImJsYWNrIi8+CiAgPGNpcmNsZSBjeD0iMzgiIGN5PSIyNiIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIvPgogIDxjaXJjbGUgY3g9IjQ4IiBjeT0iMzIiIHI9IjIiIGZpbGw9IiMxMTEiLz4KICA8cGF0aCBkPSJNNDIsMzggUTQ2LDQyIDQyLDQyIiBzdHJva2U9IiMxMTEiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPgogIDxlbGxpcHNlIGN4PSIyNiIgY3k9IjU0IiByeD0iOCIgcnk9IjQiIGZpbGw9IiMwMDhiOGIiLz4KICA8ZWxsaXBzZSBjeD0iMjYiIGN5PSI1MiIgcng9IjYiIHJ5PSIyIiBmaWxsPSIjMDBjZWQxIi8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iNTQiIHJ4PSI4IiByeT0iNCIgZmlsbD0iIzAwOGI4YiIvPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjUyIiByeD0iNiIgcnk9IjIiIGZpbGw9IiMwMGNlZDEiLz4KICA8ZWxsaXBzZSBjeD0iMjYiIGN5PSI0OSIgcng9IjQiIHJ5PSIxLjIiIGZpbGw9IiNmZmQ3MDAiLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSI0OSIgcng9IjQiIHJ5PSIxLjIiIGZpbGw9IiNmZmQ3MDAiLz4KICA8cmVjdCB4PSIyNCIgeT0iNDYiIHdpZHRoPSI1IiBoZWlnaHQ9IjYiIGZpbGw9IiNmZmQ3MDAiLz4KICA8cmVjdCB4PSIzNSIgeT0iNDYiIHdpZHRoPSI1IiBoZWlnaHQ9IjYiIGZpbGw9IiNmZmQ3MDAiLz4KICA8cG9seWdvbiBwb2ludHM9IjI4LDE4IDMyLDggMzYsMTgiIGZpbGw9IiNmZmQ3MDAiLz4KICA8cG9seWdvbiBwb2ludHM9IjMwLDE4IDMyLDEyIDM0LDE4IiBmaWxsPSIjZjVjMjhhIi8+Cjwvc3ZnPgo=';

// Knuckles the Echidna (red body, purple eyes, spiked fists)
var knucklesImg = new Image();
knucklesImg.onload = function() { knucklesImgOk = true; };
knucklesImg.onerror = function() { console.error("knucklesImg FAILED"); };
knucklesImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjM0IiByPSIxNiIgZmlsbD0iI2NjMjIwMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsMjggNCwzMiAxNiwzNCIgZmlsbD0iI2FhMTEwMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTYsMzQgMiw0MCAxNCwzOCIgZmlsbD0iI2FhMTEwMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsMzggNiw0OCAxNiw0MiIgZmlsbD0iI2FhMTEwMCIvPgogIDxlbGxpcHNlIGN4PSIzMiIgY3k9IjQwIiByeD0iOCIgcnk9IjQiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjciLz4KICA8ZWxsaXBzZSBjeD0iMzgiIGN5PSIzNiIgcng9IjEwIiByeT0iOCIgZmlsbD0iI2Y1YjA3MCIvPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjI4IiByeD0iNyIgcnk9IjgiIGZpbGw9IndoaXRlIi8+CiAgPGNpcmNsZSBjeD0iNDAiIGN5PSIyOCIgcj0iNCIgZmlsbD0iIzdiMDBmZiIvPgogIDxjaXJjbGUgY3g9IjQxIiBjeT0iMjciIHI9IjIiIGZpbGw9ImJsYWNrIi8+CiAgPGNpcmNsZSBjeD0iMzgiIGN5PSIyNiIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIvPgogIDxjaXJjbGUgY3g9IjQ4IiBjeT0iMzIiIHI9IjIiIGZpbGw9IiMxMTEiLz4KICA8cGF0aCBkPSJNNDIsMzggUTQ2LDQyIDQyLDQyIiBzdHJva2U9IiMxMTEiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPgogIDxlbGxpcHNlIGN4PSIyNCIgY3k9IjU0IiByeD0iOSIgcnk9IjQiIGZpbGw9IiNjYzIyMjIiLz4KICA8ZWxsaXBzZSBjeD0iMjQiIGN5PSI1MiIgcng9IjYiIHJ5PSIyIiBmaWxsPSIjNDRhYTIyIi8+CiAgPGVsbGlwc2UgY3g9IjQwIiBjeT0iNTQiIHJ4PSI5IiByeT0iNCIgZmlsbD0iI2NjMjIyMiIvPgogIDxlbGxpcHNlIGN4PSI0MCIgY3k9IjUyIiByeD0iNiIgcnk9IjIiIGZpbGw9IiM0NGFhMjIiLz4KICA8cmVjdCB4PSIyMiIgeT0iNDYiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNjYzIyMDAiLz4KICA8cmVjdCB4PSIzNiIgeT0iNDYiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIGZpbGw9IiNjYzIyMDAiLz4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjM2IiByPSI4IiBmaWxsPSJ3aGl0ZSIvPgogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMzMiIHI9IjIuNSIgZmlsbD0iI2NjMjIwMCIvPgogIDxjaXJjbGUgY3g9IjIwIiBjeT0iMzEiIHI9IjIuNSIgZmlsbD0iI2NjMjIwMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMjgsMTggMzIsOCAzNiwxOCIgZmlsbD0iI2NjMjIwMCIvPgogIDxwb2x5Z29uIHBvaW50cz0iMzAsMTggMzIsMTIgMzQsMTgiIGZpbGw9IiNmNWIwNzAiLz4KPC9zdmc+Cg==';

// Super Knuckles (pink body, red eyes, golden aura)
var superKnucklesImg = new Image();
superKnucklesImg.onload = function() { superKnucklesImgOk = true; };
superKnucklesImg.onerror = function() { console.error("superKnucklesImg FAILED"); };
superKnucklesImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjM0IiByPSIzMCIgZmlsbD0idXJsKCNrbkEpIiBvcGFjaXR5PSIwLjQiLz4KICA8ZGVmcz4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0ia25BIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZGQwMCIgc3RvcC1vcGFjaXR5PSIwLjYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmZkZDAwIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzQiIHI9IjE2IiBmaWxsPSIjZmY2OWI0Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIxOCwyOCA0LDMyIDE2LDM0IiBmaWxsPSIjZGQ0NDg4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIxNiwzNCAyLDQwIDE0LDM4IiBmaWxsPSIjZGQ0NDg4Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIxOCwzOCA2LDQ4IDE2LDQyIiBmaWxsPSIjZGQ0NDg4Ii8+CiAgPGVsbGlwc2UgY3g9IjMyIiBjeT0iNDAiIHJ4PSI4IiByeT0iNCIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuNyIvPgogIDxlbGxpcHNlIGN4PSIzOCIgY3k9IjM2IiByeD0iMTAiIHJ5PSI4IiBmaWxsPSIjZjViMDcwIi8+CiAgPGVsbGlwc2UgY3g9IjM4IiBjeT0iMjgiIHJ4PSI3IiByeT0iOCIgZmlsbD0id2hpdGUiLz4KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjI4IiByPSI0IiBmaWxsPSIjY2MwMDAwIi8+CiAgPGNpcmNsZSBjeD0iNDEiIGN5PSIyNyIgcj0iMiIgZmlsbD0iYmxhY2siLz4KICA8Y2lyY2xlIGN4PSIzOCIgY3k9IjI2IiByPSIxLjUiIGZpbGw9IndoaXRlIi8+CiAgPGNpcmNsZSBjeD0iNDgiIGN5PSIzMiIgcj0iMiIgZmlsbD0iIzExMSIvPgogIDxwYXRoIGQ9Ik00MiwzOCBRNDYsNDIgNDIsNDIiIHN0cm9rZT0iIzExMSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+CiAgPGVsbGlwc2UgY3g9IjI0IiBjeT0iNTQiIHJ4PSI5IiByeT0iNCIgZmlsbD0iI2NjMjIyMiIvPgogIDxlbGxpcHNlIGN4PSIyNCIgY3k9IjUyIiByeD0iNiIgcnk9IjIiIGZpbGw9IiM0NGFhMjIiLz4KICA8ZWxsaXBzZSBjeD0iNDAiIGN5PSI1NCIgcng9IjkiIHJ5PSI0IiBmaWxsPSIjY2MyMjIyIi8+CiAgPGVsbGlwc2UgY3g9IjQwIiBjeT0iNTIiIHJ4PSI2IiByeT0iMiIgZmlsbD0iIzQ0YWEyMiIvPgogIDxyZWN0IHg9IjIyIiB5PSI0NiIgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2ZmNjliNCIvPgogIDxyZWN0IHg9IjM2IiB5PSI0NiIgd2lkdGg9IjYiIGhlaWdodD0iNiIgZmlsbD0iI2ZmNjliNCIvPgogIDxjaXJjbGUgY3g9IjIwIiBjeT0iMzYiIHI9IjgiIGZpbGw9IndoaXRlIi8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIzMyIgcj0iMi41IiBmaWxsPSIjZmY2OWI0Ii8+CiAgPGNpcmNsZSBjeD0iMjAiIGN5PSIzMSIgcj0iMi41IiBmaWxsPSIjZmY2OWI0Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIyOCwxOCAzMiw4IDM2LDE4IiBmaWxsPSIjZmY2OWI0Ii8+CiAgPHBvbHlnb24gcG9pbnRzPSIzMCwxOCAzMiwxMiAzNCwxOCIgZmlsbD0iI2Y1YjA3MCIvPgo8L3N2Zz4K';

// Offscreen canvas for hyper character color cycling
var hyperCanvas = document.createElement('canvas');
hyperCanvas.width = 256; hyperCanvas.height = 256;
var hyperCtx = hyperCanvas.getContext('2d');

// ───────────────────────────────────────────────────────
// Draw: Chaos Emerald gem
// ───────────────────────────────────────────────────────
function drawGem(cx, cy, w, h, col, hi, sh, glow, angle) {
  glow = glow || 0; angle = angle || 0;
  X.save(); X.translate(cx, cy); X.rotate(angle);

  if (glow > 0) {
    X.beginPath(); X.arc(0,0,glow,0,Math.PI*2);
    var gg = X.createRadialGradient(0,0,0,0,0,glow);
    gg.addColorStop(0, col + 'aa');
    gg.addColorStop(0.5, col + '33');
    gg.addColorStop(1, col + '00');
    X.fillStyle = gg; X.fill();
  }

  // 8-point diamond shape
  X.beginPath();
  X.moveTo(0,    -h);
  X.lineTo( w*.55, -h*.45);
  X.lineTo( w,    -h*.05);
  X.lineTo( w*.55,  h*.45);
  X.lineTo( 0,     h);
  X.lineTo(-w*.55,  h*.45);
  X.lineTo(-w,    -h*.05);
  X.lineTo(-w*.55, -h*.45);
  X.closePath();

  var rg2 = X.createRadialGradient(-w*.25,-h*.3,0, 0,0,Math.max(w,h)*1.2);
  rg2.addColorStop(0, hi);
  rg2.addColorStop(0.45, col);
  rg2.addColorStop(1, sh);
  X.fillStyle = rg2; X.fill();
  X.strokeStyle = 'rgba(255,255,255,0.35)'; X.lineWidth = 1.5; X.stroke();

  // Facet lines
  X.strokeStyle = 'rgba(255,255,255,0.22)'; X.lineWidth = 1;
  var facets = [[0,-h,0,0], [-w*.55,-h*.45,0,0], [w*.55,-h*.45,0,0], [-w*.55,h*.45,0,0], [w*.55,h*.45,0,0]];
  facets.forEach(function(f) { X.beginPath(); X.moveTo(f[0],f[1]); X.lineTo(f[2],f[3]); X.stroke(); });

  // Shine highlight
  X.beginPath(); X.ellipse(-w*.22,-h*.32, w*.17,h*.07, -0.4, 0, Math.PI*2);
  X.fillStyle = 'rgba(255,255,255,0.5)'; X.fill();

  X.restore();
}

// ───────────────────────────────────────────────────────
// Draw: Rainbow Gem (Hyper Emerald)
// ───────────────────────────────────────────────────────
function drawRainbowGem(cx, cy, w, h, glow, angle, f) {
  f = f || 0;
  var hue = (f * 5) % 360;
  var col = 'hsl(' + hue + ',100%,55%)';
  var hi  = 'hsl(' + hue + ',100%,80%)';
  var sh  = 'hsl(' + ((hue+180)%360) + ',80%,30%)';

  X.save(); X.translate(cx, cy); X.rotate(angle || 0);

  if (glow > 0) {
    X.beginPath(); X.arc(0,0,glow,0,Math.PI*2);
    var gg = X.createRadialGradient(0,0,0,0,0,glow);
    gg.addColorStop(0, 'hsla(' + hue + ',100%,70%,0.6)');
    gg.addColorStop(0.5, 'hsla(' + ((hue+60)%360) + ',100%,60%,0.2)');
    gg.addColorStop(1, 'hsla(' + ((hue+120)%360) + ',100%,50%,0)');
    X.fillStyle = gg; X.fill();
  }

  X.beginPath();
  X.moveTo(0, -h);
  X.lineTo( w*.55, -h*.45);
  X.lineTo( w, -h*.05);
  X.lineTo( w*.55, h*.45);
  X.lineTo( 0, h);
  X.lineTo(-w*.55, h*.45);
  X.lineTo(-w, -h*.05);
  X.lineTo(-w*.55, -h*.45);
  X.closePath();

  var rg = X.createRadialGradient(-w*.25,-h*.3,0, 0,0,Math.max(w,h)*1.2);
  rg.addColorStop(0, hi);
  rg.addColorStop(0.45, col);
  rg.addColorStop(1, sh);
  X.fillStyle = rg; X.fill();
  X.strokeStyle = 'rgba(255,255,255,0.5)'; X.lineWidth = 1.5; X.stroke();

  X.strokeStyle = 'rgba(255,255,255,0.22)'; X.lineWidth = 1;
  var facets = [[0,-h,0,0], [-w*.55,-h*.45,0,0], [w*.55,-h*.45,0,0], [-w*.55,h*.45,0,0], [w*.55,h*.45,0,0]];
  facets.forEach(function(f) { X.beginPath(); X.moveTo(f[0],f[1]); X.lineTo(f[2],f[3]); X.stroke(); });

  X.beginPath(); X.ellipse(-w*.22,-h*.32, w*.17,h*.07, -0.4, 0, Math.PI*2);
  X.fillStyle = 'rgba(255,255,255,0.6)'; X.fill();

  X.restore();
}

// ───────────────────────────────────────────────────────
// Draw: Sonic / Super Sonic character
// ───────────────────────────────────────────────────────
function drawSonicChar(x, y, sz, isSuper, leg, faceRight) {
  if (faceRight === undefined) faceRight = true;
  var img = isSuper ? superSonicImg : sonicImg;

  X.save(); X.translate(x, y);
  if (!faceRight) X.scale(-1, 1);

  // Super Sonic golden aura
  if (isSuper) {
    var ag = X.createRadialGradient(0,0, sz*0.5, 0,0, sz*2.8);
    ag.addColorStop(0, 'rgba(255,220,0,0.3)');
    ag.addColorStop(1, 'rgba(255,220,0,0)');
    X.beginPath(); X.arc(0,0, sz*2.8, 0, Math.PI*2);
    X.fillStyle = ag; X.fill();
  }

  var loaded = isSuper ? superSonicImgOk : sonicImgOk;
  if (loaded) {
    try {
      var aspect = img.naturalWidth / img.naturalHeight;
      var drawH = sz * 3.5;
      var drawW = drawH * aspect;
      X.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    } catch(e) { loaded = false; }
  }
  if (!loaded) {
    X.beginPath(); X.arc(0, 0, sz, 0, Math.PI*2);
    X.fillStyle = isSuper ? '#f5d020' : '#1a4fcc'; X.fill();
    X.strokeStyle = '#fff'; X.lineWidth = 2; X.stroke();
    X.fillStyle = '#fff'; X.font = (sz*0.6)+'px sans-serif'; X.textAlign = 'center';
    X.fillText(isSuper ? 'SS' : 'S', 0, sz*0.25);
  }

  X.restore();
}

// ───────────────────────────────────────────────────────
// Draw: Shadow / Super Shadow character
// ───────────────────────────────────────────────────────
function drawShadowChar(x, y, sz, isSuper, leg, faceRight) {
  if (faceRight === undefined) faceRight = true;
  var img = isSuper ? superShadowImg : shadowImg;

  X.save(); X.translate(x, y);
  if (!faceRight) X.scale(-1, 1);

  if (isSuper) {
    var ag = X.createRadialGradient(0,0, sz*0.5, 0,0, sz*2.8);
    ag.addColorStop(0, 'rgba(255,220,0,0.3)');
    ag.addColorStop(1, 'rgba(255,220,0,0)');
    X.beginPath(); X.arc(0,0, sz*2.8, 0, Math.PI*2);
    X.fillStyle = ag; X.fill();
  }

  var loaded = isSuper ? superShadowImgOk : shadowImgOk;
  if (loaded) {
    try {
      var aspect = img.naturalWidth / img.naturalHeight;
      var drawH = sz * 3.5;
      var drawW = drawH * aspect;
      X.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    } catch(e) { loaded = false; }
  }
  if (!loaded) {
    X.beginPath(); X.arc(0, 0, sz, 0, Math.PI*2);
    X.fillStyle = isSuper ? '#f5e06d' : '#1a1a2e'; X.fill();
    X.strokeStyle = isSuper ? '#ffd700' : '#cc0000'; X.lineWidth = 2; X.stroke();
    X.fillStyle = '#fff'; X.font = (sz*0.6)+'px sans-serif'; X.textAlign = 'center';
    X.fillText(isSuper ? 'SS' : 'Sh', 0, sz*0.25);
  }

  X.restore();
}

// ───────────────────────────────────────────────────────
// Draw: Silver / Super Silver character
// ───────────────────────────────────────────────────────
function drawSilverChar(x, y, sz, isSuper, leg, faceRight) {
  if (faceRight === undefined) faceRight = true;
  var img = isSuper ? superSilverImg : silverImg;

  X.save(); X.translate(x, y);
  if (!faceRight) X.scale(-1, 1);

  if (isSuper) {
    var ag = X.createRadialGradient(0,0, sz*0.5, 0,0, sz*2.8);
    ag.addColorStop(0, 'rgba(255,220,0,0.3)');
    ag.addColorStop(1, 'rgba(255,220,0,0)');
    X.beginPath(); X.arc(0,0, sz*2.8, 0, Math.PI*2);
    X.fillStyle = ag; X.fill();
  }

  var loaded = isSuper ? superSilverImgOk : silverImgOk;
  if (loaded) {
    try {
      var aspect = img.naturalWidth / img.naturalHeight;
      var drawH = sz * 3.5;
      var drawW = drawH * aspect;
      X.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    } catch(e) { loaded = false; }
  }
  if (!loaded) {
    X.beginPath(); X.arc(0, 0, sz, 0, Math.PI*2);
    X.fillStyle = isSuper ? '#ffd700' : '#b8bcc8'; X.fill();
    X.strokeStyle = isSuper ? '#ffd700' : '#00ced1'; X.lineWidth = 2; X.stroke();
    X.fillStyle = '#fff'; X.font = (sz*0.6)+'px sans-serif'; X.textAlign = 'center';
    X.fillText(isSuper ? 'SSv' : 'Sv', 0, sz*0.25);
  }

  X.restore();
}

// ───────────────────────────────────────────────────────
// Draw: Knuckles / Super Knuckles character
// ───────────────────────────────────────────────────────
function drawKnucklesChar(x, y, sz, isSuper, leg, faceRight) {
  if (faceRight === undefined) faceRight = true;
  var img = isSuper ? superKnucklesImg : knucklesImg;

  X.save(); X.translate(x, y);
  if (!faceRight) X.scale(-1, 1);

  if (isSuper) {
    var ag = X.createRadialGradient(0,0, sz*0.5, 0,0, sz*2.8);
    ag.addColorStop(0, 'rgba(255,220,0,0.3)');
    ag.addColorStop(1, 'rgba(255,220,0,0)');
    X.beginPath(); X.arc(0,0, sz*2.8, 0, Math.PI*2);
    X.fillStyle = ag; X.fill();
  }

  var loaded = isSuper ? superKnucklesImgOk : knucklesImgOk;
  if (loaded) {
    try {
      var aspect = img.naturalWidth / img.naturalHeight;
      var drawH = sz * 3.5;
      var drawW = drawH * aspect;
      X.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    } catch(e) { loaded = false; }
  }
  if (!loaded) {
    X.beginPath(); X.arc(0, 0, sz, 0, Math.PI*2);
    X.fillStyle = isSuper ? '#ff69b4' : '#cc2200'; X.fill();
    X.strokeStyle = '#fff'; X.lineWidth = 2; X.stroke();
    X.fillStyle = '#fff'; X.font = (sz*0.5)+'px sans-serif'; X.textAlign = 'center';
    X.fillText(isSuper ? 'SK' : 'K', 0, sz*0.25);
  }

  X.restore();
}

// Draw fist icon for Knuckles ability
function drawFistIcon(x, y, sz, cooldownPct) {
  X.save(); X.translate(x, y);
  // Background circle
  X.beginPath(); X.arc(0, 0, sz, 0, Math.PI*2);
  X.fillStyle = 'rgba(0,0,0,0.6)'; X.fill();
  X.strokeStyle = cooldownPct <= 0 ? '#ff4400' : '#555';
  X.lineWidth = 2; X.stroke();

  // Fist shape (colored or grey based on cooldown)
  var fistCol = cooldownPct <= 0 ? '#cc2200' : '#555';
  var spikeCol = cooldownPct <= 0 ? '#fff' : '#777';

  // If cooling down, clip to show color filling from bottom
  if (cooldownPct > 0) {
    // Draw grey fist first
    X.beginPath(); X.arc(0, 0, sz-2, 0, Math.PI*2); X.clip();
    // Grey fist
    X.fillStyle = '#555';
    X.fillRect(-sz*0.5, -sz*0.6, sz, sz*1.2);
    // Colored portion fills from bottom based on cooldown remaining
    var fillH = sz * 2 * (1 - cooldownPct);
    X.fillStyle = '#cc2200';
    X.fillRect(-sz*0.5, sz*0.6 - fillH, sz, fillH);
  }

  // Draw fist shape on top
  X.beginPath();
  X.arc(0, -sz*0.1, sz*0.45, 0, Math.PI*2);
  X.fillStyle = fistCol; X.fill();
  // Spikes
  for (var sp = 0; sp < 3; sp++) {
    var sx = -sz*0.25 + sp*sz*0.25;
    X.beginPath(); X.moveTo(sx-sz*0.08, -sz*0.5);
    X.lineTo(sx, -sz*0.75); X.lineTo(sx+sz*0.08, -sz*0.5);
    X.fillStyle = spikeCol; X.fill();
  }

  X.restore();
}

// ───────────────────────────────────────────────────────
// Draw: Hyper character (rainbow color-cycling overlay)
// charType: 'sonic' | 'shadow' | 'silver' | 'knuckles'
// ───────────────────────────────────────────────────────
function drawHyperChar(x, y, sz, charType, leg, faceRight, f) {
  f = f || 0;
  var hue = (f * 8) % 360;

  // Rainbow aura (drawn on main canvas first)
  var ag = X.createRadialGradient(x, y, sz*0.3, x, y, sz*3.2);
  ag.addColorStop(0, 'hsla(' + hue + ',100%,75%,0.4)');
  ag.addColorStop(0.4, 'hsla(' + ((hue+90)%360) + ',100%,65%,0.15)');
  ag.addColorStop(1, 'hsla(' + ((hue+180)%360) + ',100%,50%,0)');
  X.beginPath(); X.arc(x, y, sz*3.2, 0, Math.PI*2);
  X.fillStyle = ag; X.fill();

  // Draw character onto offscreen canvas
  hyperCtx.clearRect(0, 0, 256, 256);
  var origX = X;
  X = hyperCtx;
  X.save(); X.translate(128, 128);
  if (charType === 'shadow') {
    drawShadowChar(0, 0, sz, true, leg, faceRight);
  } else if (charType === 'silver') {
    drawSilverChar(0, 0, sz, true, leg, faceRight);
  } else if (charType === 'knuckles') {
    drawKnucklesChar(0, 0, sz, true, leg, faceRight);
  } else {
    drawSonicChar(0, 0, sz, true, leg, faceRight);
  }
  X.restore();

  // Whiten the body (covers the gold super base)
  X.globalCompositeOperation = 'source-atop';
  X.fillStyle = 'rgba(255,255,255,0.75)';
  X.fillRect(0, 0, 256, 256);
  // Apply rainbow tint on top
  X.fillStyle = 'hsla(' + hue + ',100%,75%,0.35)';
  X.fillRect(0, 0, 256, 256);
  X.globalCompositeOperation = 'source-over';

  // Restore main context and draw the result
  X = origX;
  X.drawImage(hyperCanvas, x - 128, y - 128);
}

// ───────────────────────────────────────────────────────
// Unified character draw — dispatches based on mode
// ───────────────────────────────────────────────────────
function drawCharByMode(x, y, sz, m, leg, faceRight, f) {
  if (m === 'hyperSonic')  return drawHyperChar(x, y, sz, 'sonic', leg, faceRight, f);
  if (m === 'hyperShadow') return drawHyperChar(x, y, sz, 'shadow', leg, faceRight, f);
  if (m === 'hyperSilver') return drawHyperChar(x, y, sz, 'silver', leg, faceRight, f);
  if (m === 'hyperKnuckles') return drawHyperChar(x, y, sz, 'knuckles', leg, faceRight, f);
  if (m === 'superSilver') return drawSilverChar(x, y, sz, true, leg, faceRight);
  if (m === 'superKnuckles') return drawKnucklesChar(x, y, sz, true, leg, faceRight);
  if (m === 'silver')      return drawSilverChar(x, y, sz, false, leg, faceRight);
  if (m === 'knuckles')    return drawKnucklesChar(x, y, sz, false, leg, faceRight);
  if (m === 'hyperEm')     return drawRainbowGem(x, y, PR, PR*1.3, PR*1.2, Math.sin((f||0)*0.05)*0.3, f);
  if (m === 'superShadow') return drawShadowChar(x, y, sz, true, leg, faceRight);
  if (m === 'shadow')      return drawShadowChar(x, y, sz, false, leg, faceRight);
  if (m === 'super')       return drawSonicChar(x, y, sz, true, leg, faceRight);
  if (m === 'sonic')       return drawSonicChar(x, y, sz, false, leg, faceRight);
}
