'use client';

import React, { useCallback, useEffect, useRef } from "react"; // Import useRef
import { SendIcon } from "../../icons";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from '@tiptap/core';
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import "./editor.css";

const EnterKeyInterceptor = Extension.create({
  name: 'enterKeyInterceptor',
  addKeyboardShortcuts() {
    return {
      'Enter': () => {
        if (this.editor.state.doc.textContent.trim().length === 0) {
          return true;
        }
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
  variant?: 'homepage' | 'bottomBar';
}

export default function ReusableTiptapEditor({ 
  content,
  onUpdate,
  onSubmit, 
  placeholder,
  disabled = false,
  isSubmitting = false,
  variant = 'homepage',
}: ReusableTiptapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: false,
        includeChildren: true,
        emptyEditorClass: 'is-editor-empty',
      }),
      EnterKeyInterceptor,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getText());
    },
    onTransaction: ({ editor, transaction }) => {
      if (transaction.docChanged) {
        editor.chain().focus().scrollIntoView().run();
      }
    },
    
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'search-section__editor',
        style: 'outline:none;box-shadow:none;border:none;',
        'data-placeholder': placeholder,
      },
      handlePaste: (view, event, slice) => {
        // Get pasted text as plain text.
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          // Insert it at the current selection.
          const { from, to } = view.state.selection;
          view.dispatch(view.state.tr.insertText(text, from, to));
        }
        // Prevent the default paste behavior.
        return true;
      },
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!content.trim()) {
        return;
      }
      handleSubmit();
    }
  }, [content, handleSubmit]);

  const handleClickOnContainer = (e: React.MouseEvent) => {
    const editorContentEl = containerRef.current?.querySelector('.ProseMirror');
    if (editorContentEl && editorContentEl.contains(e.target as Node)) {
      return;
    }
    editor?.chain().focus().run();
  };

  const containerClass = variant === 'bottomBar' 
    ? "bottom-editor__container" 
    : "search-section__input-container";

  return (
    <div 
      ref={containerRef}
      className={containerClass} 
      onClick={handleClickOnContainer}
    >
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
              <SendIcon
                className="text-current"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}