import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import UserContext from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import '../styling/site-text-editor.css';

const SKIP_SELECTOR = [
  'input', 'textarea', 'select', 'option', 'script', 'style', 'svg',
  '[data-site-text-editor]', '.site-text-editor', '.ministry-content-admin',
].join(',');

function elementKey(element, root) {
  const parts = [];
  let current = element;
  while (current && current !== root) {
    const parent = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((item) => item.tagName === current.tagName);
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`);
    current = parent;
  }
  return parts.join('>');
}

function editableElements(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll('*')).filter((element) => {
    if (element.matches(SKIP_SELECTOR) || element.closest(SKIP_SELECTOR)) return false;
    if (element.children.length > 0) return false;
    return Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    );
  });
}

export default function SiteTextEditor() {
  const { user } = useContext(UserContext);
  const { language } = useLanguage();
  const location = useLocation();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const originals = useRef(new Map());
  const root = document.querySelector('#root');
  const pagePath = location.pathname;

  const applyOverrides = useCallback(async () => {
    try {
      const data = await api.getSiteTextOverrides(pagePath, language);
      editableElements(root).forEach((element) => {
        const key = elementKey(element, root);
        element.dataset.siteTextKey = key;
        if (Object.prototype.hasOwnProperty.call(data.overrides || {}, key)) {
          element.textContent = data.overrides[key];
        }
      });
    } catch {
      // The page remains usable if editable content cannot be loaded.
    }
  }, [language, pagePath, root]);

  useEffect(() => {
    const timer = window.setTimeout(applyOverrides, 0);
    return () => window.clearTimeout(timer);
  }, [applyOverrides]);

  useEffect(() => {
    if (!user || !editing) return undefined;
    const elements = editableElements(root);
    originals.current = new Map();
    elements.forEach((element) => {
      const key = element.dataset.siteTextKey || elementKey(element, root);
      element.dataset.siteTextKey = key;
      originals.current.set(key, element.textContent);
      element.contentEditable = 'true';
      element.spellcheck = true;
      element.classList.add('site-text-editable');
    });

    return () => {
      elements.forEach((element) => {
        element.removeAttribute('contenteditable');
        element.classList.remove('site-text-editable');
      });
    };
  }, [editing, root, user]);

  if (!user) return null;

  const cancel = () => {
    editableElements(root).forEach((element) => {
      const original = originals.current.get(element.dataset.siteTextKey);
      if (original !== undefined) element.textContent = original;
    });
    setEditing(false);
    setStatus('');
  };

  const save = async () => {
    setStatus('Saving…');
    try {
      const changes = editableElements(root)
        .map((element) => ({
          element,
          element_key: element.dataset.siteTextKey || elementKey(element, root),
          content: element.textContent,
        }))
        .filter(({ element_key, content }) => originals.current.get(element_key) !== content);

      await Promise.all(changes.map(({ element_key, content }) => api.updateSiteTextOverride({
        page_path: pagePath,
        element_key,
        language,
        content,
      })));
      setEditing(false);
      setStatus(changes.length ? 'Saved' : 'No changes');
      window.setTimeout(() => setStatus(''), 1800);
    } catch (error) {
      setStatus(error.message || 'Could not save changes');
    }
  };

  return (
    <aside className="site-text-editor" data-site-text-editor="true" aria-label="Website text editor">
      {!editing ? (
        <button type="button" onClick={() => setEditing(true)}>Edit page text</button>
      ) : (
        <>
          <span>Click any outlined text to edit it.</span>
          <button type="button" onClick={save}>Save</button>
          <button type="button" className="site-text-editor-cancel" onClick={cancel}>Cancel</button>
        </>
      )}
      {status ? <span role="status">{status}</span> : null}
    </aside>
  );
}
