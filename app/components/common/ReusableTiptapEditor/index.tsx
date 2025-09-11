'use client';

import React, { useCallback, useEffect, useRef } from "react";
import { SendIcon } from "../../icons";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from '@tiptap/core';
import { Slice, Fragment } from '@tiptap/pm/model'; // 导入 Slice 和 Fragment
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
      // 确保使用 getHTML() 以保留格式
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
      // 使用全新的 handlePaste 函数
      handlePaste: (view, event, slice) => {
        // 从剪贴板获取纯文本内容
        const text = event.clipboardData?.getData('text/plain');

        // 如果没有文本内容，或者编辑器 schema 中没有段落节点，则退回默认粘贴行为
        if (!text || !view.state.schema.nodes.paragraph) {
          return false;
        }

        // 将文本按行分割
        const lines = text.split(/\r\n|\r|\n/);

        // 为每一行文本创建一个新的段落节点
        const fragment = Fragment.fromArray(
          lines.map(line => {
            const node = view.state.schema.nodes.paragraph.create(
              null,
              line ? view.state.schema.text(line) : null
            );
            return node;
          })
        );

        // 创建一个包含这些新段落的 Slice
        const newSlice = new Slice(fragment, 0, 0);

        // 创建一个事务，用新的 Slice 替换当前选中的内容
        const { from, to } = view.state.selection;
        const tr = view.state.tr.replaceRange(from, to, newSlice);

        // 应用这个事务
        view.dispatch(tr);

        // 返回 true，表示我们已经处理了粘贴事件，阻止默认行为
        return true;
      },
    }
  });

  useEffect(() => {
    // 检查内容是否是 HTML 格式
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