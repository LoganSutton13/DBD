import React, { useEffect, useState, useCallback, useEffect as ReactUseEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import apiService from '../services/api';

const GalleryView: React.FC = () => {
  const [items, setItems] = useState<Array<{ taskId: string; orthophotoPngUrl: string; reportPdfUrl?: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewType, setPreviewType] = useState<'image' | 'report' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [blobObjectUrl, setBlobObjectUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);

  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.listResults();
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load gallery');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const openImage = useCallback((taskId: string, url: string) => {
    setPreviewType('image');
    setPreviewUrl(apiService.buildUrl(url));
    setPreviewTitle(`Orthophoto ${taskId}`);
    setIsPreviewOpen(true);
  }, []);

  const openReport = useCallback(async (taskId: string, url: string) => {
    const absoluteUrl = apiService.buildUrl(url);
    try {
      const response = await fetch(absoluteUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/pdf' },
        mode: 'cors',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setBlobObjectUrl(objectUrl);
      setPreviewType('report');
      setPreviewUrl(objectUrl);
      setPreviewTitle(`Report ${taskId}`);
      setPageNumber(1);
      setIsPreviewOpen(true);
    } catch (_) {
      // Fall back to trying direct URL (may still render if browser allows)
      setBlobObjectUrl(null);
      setPreviewType('report');
      setPreviewUrl(absoluteUrl);
      setPreviewTitle(`Report ${taskId}`);
      setPageNumber(1);
      setIsPreviewOpen(true);
    }
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewType(null);
    if (blobObjectUrl) {
      URL.revokeObjectURL(blobObjectUrl);
    }
    setBlobObjectUrl(null);
    setPreviewUrl('');
    setPreviewTitle('');
  }, [blobObjectUrl]);

  ReactUseEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePreview]);

  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg p-8 border border-dark-700">
        <h2 className="text-2xl font-semibold text-primary-400 mb-4">
          Image Gallery
        </h2>
        <p className="text-dark-300 mb-6">
          View your uploaded drone images and stitched panoramas
        </p>
        {error && (
          <div className="text-red-400 mb-4">{error}</div>
        )}
        {loading ? (
          <div className="text-dark-300">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.length === 0 ? (
              <div className="col-span-full">
                <div className="text-center py-12">
                  <div className="text-dark-400 mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-dark-300 text-lg mb-2">No images yet</p>
                  <p className="text-dark-400 text-sm">Upload some drone images to get started</p>
                </div>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.taskId} className="bg-dark-900 rounded-lg border border-dark-700 overflow-hidden">
                  <button
                    type="button"
                    className="aspect-video bg-dark-800 overflow-hidden w-full"
                    onClick={() => openImage(item.taskId, item.orthophotoPngUrl)}
                    aria-label={`Open orthophoto ${item.taskId}`}
                  >
                    <img
                      src={apiService.buildUrl(item.orthophotoPngUrl)}
                      alt={`Orthophoto ${item.taskId}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-dark-100 font-medium">Task {item.taskId}</div>
                      {item.reportPdfUrl && (
                        <button
                          type="button"
                          onClick={() => openReport(item.taskId, item.reportPdfUrl!)}
                          className="text-primary-400 text-sm hover:underline"
                        >
                          View report
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => openImage(item.taskId, item.orthophotoPngUrl)}
                        className="px-3 py-1.5 bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors duration-200 text-sm w-full"
                      >
                        Open
                      </button>
                      <a
                        href={apiService.buildUrl(item.orthophotoPngUrl)}
                        download={`orthophoto_${item.taskId}.png`}
                        className="mt-1 inline-block text-dark-400 hover:text-dark-200 text-xs"
                      >
                        Download image
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Gallery controls placeholder */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-primary-400">
            Gallery Controls
          </h3>
          <div className="flex space-x-4">
            <button className="px-4 py-2 bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors duration-200">
              Filter
            </button>
            <button className="px-4 py-2 bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors duration-200">
              Sort
            </button>
          </div>
        </div>
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-70" onClick={closePreview} />
          <div className="relative bg-dark-900 border border-dark-700 rounded-lg shadow-xl max-w-6xl w-[92vw] max-h-[88vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
              <div className="text-dark-100 font-medium truncate pr-4">{previewTitle}</div>
              <button
                type="button"
                onClick={closePreview}
                className="text-dark-300 hover:text-dark-100 px-2 py-1 rounded"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="bg-dark-800">
              {previewType === 'image' && (
                <div className="w-[92vw] max-w-6xl max-h-[80vh] overflow-auto">
                  <img src={previewUrl} alt={previewTitle} className="block mx-auto h-auto w-full" />
                </div>
              )}
              {previewType === 'report' && (
                <div className="w-[92vw] max-w-6xl h-[80vh] overflow-auto">
                  <Document
                    file={previewUrl}
                    onLoadSuccess={(info: { numPages: number }) => setNumPages(info.numPages)}
                    onLoadError={() => {/* silent fail; modal keeps showing */}}
                    loading={<div className="p-6 text-dark-300">Loading report…</div>}
                    error={<div className="p-6 text-red-400">Failed to load PDF</div>}
                    className="flex flex-col items-center py-4"
                  >
                    <div className="bg-white">
                      <Page
                        pageNumber={pageNumber}
                        width={Math.floor(Math.min(1100, window.innerWidth * 0.86))}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  </Document>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryView;
