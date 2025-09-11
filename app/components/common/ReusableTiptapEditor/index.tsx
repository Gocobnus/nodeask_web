'use client';

import React, { useCallback, useEffect, useRef } from "react";
import { SendIcon } from "../../icons";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from '@tiptap/core';
import { Slice, Fragment } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state'; // 确保导入 TextSelection

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
      onUpdate(editor.getHTML());
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
        const text = event.clipboardData?.getData('text/plain');

        if (!text || !view.state.schema.nodes.paragraph) {
          return false;
        }

        const lines = text.split(/\r\n|\r|\n/);

        const fragment = Fragment.fromArray(
          lines.map(line => {
            const node = view.state.schema.nodes.paragraph.create(
              null,
              line ? view.state.schema.text(line) : null
            );
            return node;
          })
        );
        const newSlice = new Slice(fragment, 0, 0);

        const { from, to } = view.state.selection;
        let tr = view.state.tr.replaceRange(from, to, newSlice);

        // --- 核心修复：显式设置光标位置 ---
        // 1. 计算粘贴后内容的结束位置
        const endPosition = from + newSlice.size;
        
        // 2. 确保计算出的位置不会超出文档范围，防止 "Position out of range" 错误
        const resolvedPos = Math.min(endPosition, tr.doc.content.size);

        // 3. 创建一个折叠的选区（即光标）并设置到该安全位置
        tr = tr.setSelection(TextSelection.create(tr.doc, resolvedPos));
        // --- 修复结束 ---
        
        // 应用这个包含了内容替换和光标移动的事务
        view.dispatch(tr);

        return true;
      },
    }
  });

  useEffect(() => {
    const isHTML = /<[a-z][\s\S]*>/i.test(content);
    const editorContent = isHTML ? editor?.getHTML() : editor?.getText();

    if (editor && editorContent !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!(disabled || isSubmitting));
    }
  }, [editor, disabled, isSubmitting]);

  const handleSubmit = useCallback(() => {
    if (!editor?.state.doc.textContent.trim() || isSubmitting || disabled) return;
    onSubmit(editor.getHTML());
  }, [editor, isSubmitting, disabled, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!editor?.state.doc.textContent.trim()) {
        return;
      }
      handleSubmit();
    }
  }, [editor, handleSubmit]);

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
              disabled={!editor?.state.doc.textContent.trim() || isSubmitting || disabled}
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