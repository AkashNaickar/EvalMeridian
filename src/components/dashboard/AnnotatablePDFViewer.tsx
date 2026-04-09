"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { Check, X, Type, Trash2, Loader2, MousePointer2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use the local worker for maximum reliability and compatibility with Next.js Turbopack
// The worker file has been copied to /public/pdf.worker.min.js
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export type AnnotationType = "tick" | "cross" | "text" | "circle" | "underline" | "pen";

export interface Annotation {
  id: string;
  type: AnnotationType;
  pageNum: number;
  xPct: number; // 0 to 100 percentage from left
  yPct: number; // 0 to 100 percentage from top
  text?: string;
  path?: string; // For freehand pen
}

interface AnnotatablePDFViewerProps {
  url: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  activeTool?: AnnotationType | "cursor";
  readOnly?: boolean;
  externalError?: string | null;
}

// Sub-component to handle page visibility for virtualization
function PageWrapper({ 
  index, 
  zoom, 
  isInBuffer, 
  onVisible, 
  onClick, 
  onMouseEnter, 
  onMouseLeave,
  children 
}: { 
  index: number; 
  zoom: number; 
  isInBuffer: boolean; 
  onVisible: (index: number) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}) {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pageRef.current) return;
    
    // IntersectionObserver to track which page is currently centered in the viewport
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisible(index);
        }
      },
      { threshold: 0.1, rootMargin: '0px' }
    );

    observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, [index, onVisible]);

  // A4 standard ratio is ~1.41. We use 842pt height for 595pt width as baseline.
  const estimatedHeight = 842 * zoom;
  const estimatedWidth = 595 * zoom;

  return (
    <div 
      ref={pageRef}
      className="relative shadow-2xl transition-all duration-300 rounded-sm overflow-hidden bg-white mx-auto mb-10 group/page" 
      style={{ 
        width: estimatedWidth, 
        height: estimatedHeight,
        minHeight: estimatedHeight 
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 
        Virtualization: Only render the heavy <Page> component if it's in the buffer window.
        Otherwise, show a lightweight placeholder to maintain scroll height.
      */}
      {isInBuffer ? children : (
        <div className="flex items-center justify-center h-full w-full bg-slate-50 border-2 border-dashed border-slate-200">
          <div className="text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-20" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Page {index + 1}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AnnotatablePDFViewer({ 
  url, 
  annotations, 
  onAnnotationsChange, 
  activeTool = "cursor", 
  readOnly = false,
  externalError = null
}: AnnotatablePDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1.1); // Slightly higher default zoom for precision
  const [isHovering, setIsHovering] = useState(false);
  const [visiblePage, setVisiblePage] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Diagnostic check for worker initialization
  useEffect(() => {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
       console.error("[PDF_VIEWER] GlobalWorkerOptions.workerSrc is missing");
       setWorkerError("Worker configuration missing");
    }
  }, []);


  const onVisible = useCallback((index: number) => {
    setVisiblePage(index);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }


  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (readOnly || activeTool === "cursor") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xRaw = e.clientX - rect.left;
    const yRaw = e.clientY - rect.top;

    const xPct = (xRaw / rect.width) * 100;
    const yPct = (yRaw / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substring(2, 9),
      type: activeTool,
      pageNum,
      xPct,
      yPct,
      text: activeTool === "text" ? "" : undefined
    };

    onAnnotationsChange([...annotations, newAnnotation]);
  };

  const removeAnnotation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (readOnly) return;
    onAnnotationsChange(annotations.filter(a => a.id !== id));
  };

  const handleTextChange = (id: string, newText: string) => {
    if (readOnly) return;
    onAnnotationsChange(annotations.map(a => 
      a.id === id ? { ...a, text: newText } : a
    ));
  };

  const pdfOptions = useMemo(() => ({
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    disableAutoFetch: false,
    disableStream: false,
  }), []);

  return (
    <div className="flex w-full h-full relative bg-slate-950" ref={containerRef}>
      
      <ScrollArea className="flex-1 w-full relative custom-scrollbar">
        <div className={cn(
          "min-h-full py-24 px-8 flex flex-col items-center transition-all duration-500", 
          activeTool !== "cursor" ? "cursor-crosshair" : "cursor-default"
        )}>
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => {
              console.error("[PDF_VIEWER] Document Load Error:", error);
              setNumPages(0);
            }}
            onSourceError={(error) => {
              console.error("[PDF_VIEWER] Source Error (Worker likely failed):", error);
              setWorkerError("PDF engine failed to initialize (Worker setup error)");
            }}
            options={pdfOptions}
            loading={
              <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 animate-pulse">Initializing engine...</p>
              </div>
            }
            error={
               <div className="p-10 text-center text-red-100 bg-red-950/20 rounded-2xl border border-red-500/10 max-w-sm shadow-2xl">
                 <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                 <p className="font-semibold text-sm">
                   {workerError ? "PDF Engine Failure" : "Asset load error"}
                 </p>
                 <p className="text-[10px] opacity-60 mt-2 leading-relaxed">
                   {workerError 
                    ? `The rendering engine could not be initialized locally: ${workerError}. Check browser console.` 
                    : "Could not retrieve the digital script. Ensure secure storage permissions are valid."}
                 </p>
               </div>
            }
          >
            {numPages && Array.from(new Array(numPages), (el, index) => {
              const isInBuffer = Math.abs(index - visiblePage) <= 1;
              
              return (
                <PageWrapper
                  key={`p-${index}`}
                  index={index}
                  zoom={zoom}
                  isInBuffer={isInBuffer}
                  onVisible={onVisible}
                  onClick={(e) => handlePageClick(e, index + 1)}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <div className="relative transition-opacity duration-300">
                    <Page 
                      pageNumber={index + 1} 
                      scale={zoom}
                      renderTextLayer={false} 
                      renderAnnotationLayer={false}
                      loading={<div className="animate-pulse bg-slate-900/50 w-full h-full" />}
                      className="pointer-events-none select-none" 
                    />
                    
                    {/* Professional Annotations Layer */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      {annotations.filter(a => a.pageNum === index + 1).map((ann) => (
                        <div 
                          key={ann.id} 
                          className="absolute group pointer-events-auto"
                          style={{ left: `${ann.xPct}%`, top: `${ann.yPct}%`, transform: 'translate(-50%, -50%)' }}
                          onClick={(e) => e.stopPropagation()} 
                        >
                          {ann.type === "tick" && (
                            <div className="animate-in zoom-in duration-200">
                              <Check className="h-8 w-8 text-emerald-500 drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)] stroke-[4]" />
                            </div>
                          )}
                          {ann.type === "cross" && (
                            <div className="animate-in zoom-in duration-200">
                              <Check className="h-8 w-8 text-red-500 rotate-45 drop-shadow-[0_2px_8px_rgba(239,68,68,0.4)] stroke-[4]" />
                            </div>
                          )}
                          {ann.type === "circle" && (
                            <div className="animate-in zoom-in duration-200 h-10 w-10 border-[3.5px] border-sky-500 rounded-full drop-shadow-[0_2px_8px_rgba(14,165,233,0.4)]" />
                          )}
                          {ann.type === "underline" && (
                            <div className="animate-in slide-in-from-left-2 duration-200 w-24 h-1.5 bg-sky-500/40 rounded-full border-b-2 border-sky-500 drop-shadow-md" />
                          )}
                          
                          {ann.type === "pen" && (
                            <div className="animate-in fade-in duration-300 text-violet-400 font-mono text-[9px] font-bold bg-violet-950/40 px-1 border border-violet-500/20 rounded">
                              INK
                            </div>
                          )}
                          
                          {ann.type === "text" && (
                            <div className="animate-in zoom-in-95 fade-in duration-200 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2 rounded-lg shadow-2xl min-w-[140px] group-hover:border-slate-500 transition-colors">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">Evaluator Feedback</span>
                                <input 
                                  autoFocus
                                  type="text"
                                  disabled={readOnly}
                                  placeholder="Type observation..."
                                  value={ann.text || ""}
                                  onChange={(e) => handleTextChange(ann.id, e.target.value)}
                                  className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs font-semibold w-full text-white placeholder:text-slate-600"
                                />
                              </div>
                            </div>
                          )}
  
                          {!readOnly && (
                            <button 
                              onClick={(e) => removeAnnotation(e, ann.id)}
                              className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-500 active:scale-90"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </PageWrapper>
              );
            })}
          </Document>
        </div>
      </ScrollArea>
    </div>
  );
}

const Separator = ({ orientation, className }: { orientation: "vertical" | "horizontal", className?: string }) => (
  <div className={cn(orientation === "vertical" ? "w-px h-full" : "h-px w-full", "bg-border", className)} />
);
