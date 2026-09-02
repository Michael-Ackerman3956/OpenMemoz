declare module "page-flip" {
  interface PageFlipSettings {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    usePortrait?: boolean;
    showCover?: boolean;
    drawShadow?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    useMouseEvents?: boolean;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
    clickEventForward?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    autoSize?: boolean;
    startZIndex?: number;
    startPage?: number;
  }

  class PageFlip {
    constructor(container: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(pages: HTMLElement[]): void;
    flipNext(corner?: string): void;
    flipPrev(corner?: string): void;
    flip(pageNum: number, corner?: string): void;
    turnToPage(pageNum: number): void;
    on(event: string, callback: (data: { data: number }) => void): void;
    update(): void;
    destroy(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
  }

  export { PageFlip };
}
