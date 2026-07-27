"use client";

import dynamic from "next/dynamic";
import type { BlockNoteEditorProps } from "./components/BlockNoteEditor";

export type RichTextEditorProps = BlockNoteEditorProps;

// BlockNote monte ProseMirror sur le DOM : pas de rendu serveur possible.
// Spécifieur de package (self-reference) et non chemin relatif : sous NodeNext un
// import() dynamique exigerait une extension explicite, que le bundler ne résout pas.
const Editor = dynamic(() => import("@repo/ui/components/BlockNoteEditor").then((m) => m.BlockNoteEditor), {
  ssr: false,
  loading: () => <div className="h-24 rounded-xl bg-surface-container-low/60 animate-pulse" />,
});

export function RichTextEditor(props: RichTextEditorProps) {
  return <Editor {...props} />;
}

export default RichTextEditor;
