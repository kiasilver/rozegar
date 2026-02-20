"use client";

import React, { useState } from "react";
import { Editor, EditorState, RichUtils, getDefaultKeyBinding, DraftHandleValue } from "draft-js";
import "draft-js/dist/Draft.css";

export default function CustomEditor({
  value,
  onChange,
}: {
  value?: EditorState;
  onChange?: (state: EditorState) => void;
}) {
  const [editorState, setEditorState] = useState(
    value || EditorState.createEmpty()
  );

  const handleChange = (state: EditorState) => {
    setEditorState(state);
    onChange?.(state);
  };

  const handleKeyCommand = (
    command: string,
    state: EditorState
  ): DraftHandleValue => {
    const newState = RichUtils.handleKeyCommand(state, command);
    if (newState) {
      handleChange(newState);
      return "handled";
    }
    return "not-handled";
  };

  const toggleBlockType = (blockType: string) => {
    handleChange(RichUtils.toggleBlockType(editorState, blockType));
  };

  return (
    <div className="border rounded-md p-2 bg-white dark:bg-gray-800">
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => toggleBlockType("header-one")}
          className="text-sm px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => toggleBlockType("header-two")}
          className="text-sm px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => toggleBlockType("unstyled")}
          className="text-sm px-2 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Normal
        </button>
      </div>
      <div className="min-h-[150px] p-2 bg-white dark:bg-gray-900 text-black dark:text-white">
        <Editor
          editorState={editorState}
          onChange={handleChange}
          handleKeyCommand={handleKeyCommand}
          keyBindingFn={getDefaultKeyBinding}
        />
      </div>
    </div>
  );
}
