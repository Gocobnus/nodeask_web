'use client';

import React, { useCallback, useEffect } from "react";
import { SendIcon } from "../../icons";
import { EditorContent, useEditor, Editor } from "@tiptap/react";
import { Extension } from '@tiptap/core';
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import "./editor.css";

// 1. Define the custom extension
const EnterKeyInterceptor = Extension.create({
  name: 'enterKeyInterceptor',

  addKeyboardShortcuts() {
    return {
      'Enter': () => {
        // Check if the editor content is empty
        if (this.editor.state.doc.textContent.trim().length === 0) {
          // If it's empty, we handle it by doing nothing and stopping other commands.
          return true;
        }
        // If it's not empty, we let other commands (like our handleSubmit) proceed.
        return false;
      },
    };
  },
});

interface ReusableTiptapEditorProps {
  content: string;
  onUpdate: (newContent: string) => void;
  onSubmit: (submittedContent: string) => void;
  placeholder: string;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export default function ReusableTiptapEditor({ 
  content,
  onUpdate,
  onSubmit, 
  placeholder,
  disabled = false,
  isSubmitting = false,
}: ReusableTiptapEditorProps) {

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: false,
        includeChildren: true,
        emptyEditorClass: 'is-editor-empty',
      }),
      EnterKeyInterceptor, // 2. Add the extension to the editor
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getText()); 
    },
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'search-section__editor',
        style: 'outline:none;box-shadow:none;border:none;',
        'data-placeholder': placeholder,
      }
    }
  });

  useEffect(() => {
    if (editor && editor.getText() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!(disabled || isSubmitting));
    }
  }, [editor, disabled, isSubmitting]);

  const handleSubmit = useCallback(() => {
    if (!content.trim() || isSubmitting || disabled) return;
    onSubmit(content.trim());
  }, [content, isSubmitting, disabled, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    // 3. The Enter key logic is now primarily handled by the Tiptap extension.
    // This handler is now just for submitting non-empty content.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="search-section__input-container">
      <div className="search-section__inner-container">
        {editor ? (
          <div className="search-section__input">
            <div className="search-section__scroller">
              <EditorContent
                editor={editor}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        ) : (
          <div
            className="search-section__input search-section__placeholder"
            data-placeholder={placeholder}
            aria-hidden="true"
          />
        )}
        <div className="search-section__bottom-area">
          <div className="search-section__function-component">
            {/* Placeholder */}
          </div>
          <div className="search-section__submit-component">
            <button
              className="search-section__submit-button"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting || disabled}
              type="button"
            >
              {isSubmitting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <SendIcon
                  className="text-current"
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}