// webpack worker entry point - pdfjs worker를 classic Worker로 번들링하기 위한 래퍼
// new Worker(new URL('./pdf-worker-entry', import.meta.url)) 패턴으로 사용
import 'pdfjs-dist/build/pdf.worker.min.mjs';
