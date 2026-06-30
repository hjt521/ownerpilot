// lib/documents/pdf.ts
// Resolve & Document PDF pipeline. Renders DocumentRender → PDF and stores a documents row.
// Reuses the repo's existing PDF mechanism (the Phase 2D RTC packet pipeline). The render interface is stable;
// the concrete renderer (e.g. the existing server PDF util) is injected so this module has no hard PDF dep.

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { DocumentRender, type DocumentRenderProps } from './DocumentRender';
import { serviceClient } from '@/lib/chat/session';

/** Render the document to HTML (the PDF renderer consumes this; reuse the repo's html→pdf util). */
export function renderDocumentHtml(props: DocumentRenderProps): string {
  return renderToStaticMarkup(createElement(DocumentRender, props));
}

/** Pluggable html→pdf — wired to the repo's existing PDF util at integration. */
export type HtmlToPdf = (html: string) => Promise<Uint8Array>;

export interface StoredDocument { id: string; storagePath: string; }

/** Render + store: produce the PDF, upload to storage, insert a documents row. Returns the documents id. */
export async function produceDocument(
  props: DocumentRenderProps,
  meta: { userId: string; propertyId: string | null; docType: string; fileName: string },
  htmlToPdf: HtmlToPdf,
  sb = serviceClient(),
): Promise<StoredDocument> {
  const html = renderDocumentHtml(props);
  const pdf = await htmlToPdf(html);
  const storagePath = `resolution_documents/${meta.userId}/${Date.now()}_${meta.fileName}`;
  const up = await sb.storage.from('documents').upload(storagePath, pdf, { contentType: 'application/pdf', upsert: false });
  if (up.error) throw new Error(`document upload failed: ${up.error.message}`);
  const { data, error } = await sb.from('documents').insert({
    user_id: meta.userId, property_id: meta.propertyId, doc_type: meta.docType,
    file_name: meta.fileName, storage_path: storagePath,
  }).select('id').single();
  if (error) throw new Error(`document row insert failed: ${error.message}`);
  return { id: data.id, storagePath };
}
