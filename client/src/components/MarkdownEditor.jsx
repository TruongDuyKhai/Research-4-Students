import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bold, Italic, Strikethrough, Heading2, Code, List, ListOrdered, Quote, Eye, EyeOff } from 'lucide-react';

/**
 * Reusable markdown textarea with toolbar and live preview toggle.
 * Props: value, onChange, placeholder, rows, disabled, className
 */
const MarkdownEditor = ({ value, onChange, placeholder, rows = 6, disabled, className = '' }) => {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef(null);

  const insert = (type) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end);
    let text;
    switch (type) {
      case 'bold':    text = `**${selected || 'in đậm'}**`; break;
      case 'italic':  text = `*${selected || 'in nghiêng'}*`; break;
      case 'strike':  text = `~~${selected || 'văn bản'}~~`; break;
      case 'heading': text = `\n## ${selected || 'Tiêu đề'}`; break;
      case 'code':    text = selected.includes('\n') ? `\`\`\`\n${selected || 'code'}\n\`\`\`` : `\`${selected || 'code'}\``; break;
      case 'ul':      text = `\n- ${selected || 'Mục danh sách'}`; break;
      case 'ol':      text = `\n1. ${selected || 'Mục danh sách'}`; break;
      case 'quote':   text = `\n> ${selected || 'Trích dẫn'}`; break;
      default: return;
    }
    const newVal = value.substring(0, start) + text + value.substring(end);
    onChange({ target: { value: newVal } });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  return (
    <div className={`markdown-editor-wrapper ${className}`}>
      <div className="markdown-toolbar">
        <button type="button" className="md-btn" onClick={() => insert('bold')} title="In đậm" disabled={disabled}><Bold size={14} /></button>
        <button type="button" className="md-btn" onClick={() => insert('italic')} title="In nghiêng" disabled={disabled}><Italic size={14} /></button>
        <button type="button" className="md-btn" onClick={() => insert('strike')} title="Gạch ngang" disabled={disabled}><Strikethrough size={14} /></button>
        <div className="md-toolbar-separator" />
        <button type="button" className="md-btn" onClick={() => insert('heading')} title="Tiêu đề" disabled={disabled}><Heading2 size={14} /></button>
        <button type="button" className="md-btn" onClick={() => insert('quote')} title="Trích dẫn" disabled={disabled}><Quote size={14} /></button>
        <button type="button" className="md-btn" onClick={() => insert('code')} title="Code" disabled={disabled}><Code size={14} /></button>
        <div className="md-toolbar-separator" />
        <button type="button" className="md-btn" onClick={() => insert('ul')} title="Danh sách" disabled={disabled}><List size={14} /></button>
        <button type="button" className="md-btn" onClick={() => insert('ol')} title="Danh sách số" disabled={disabled}><ListOrdered size={14} /></button>
        <div className="md-toolbar-spacer" />
        <button type="button" className={`md-btn md-btn-preview ${preview ? 'active' : ''}`} onClick={() => setPreview(p => !p)} disabled={disabled}>
          {preview ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{preview ? 'Chỉnh sửa' : 'Xem trước'}</span>
        </button>
      </div>

      {preview ? (
        <div className="markdown-preview-pane">
          {value.trim()
            ? <ReactMarkdown className="md-rendered">{value}</ReactMarkdown>
            : <span className="markdown-preview-empty">Chưa có nội dung...</span>
          }
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          className="composer-textarea-content"
          placeholder={placeholder}
          rows={rows}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default MarkdownEditor;
