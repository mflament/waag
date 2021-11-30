import { ImageLuminance } from './ImageLuminance';

export class Canvas {
  private readonly _canvas: HTMLCanvasElement;
  private readonly _context: CanvasRenderingContext2D;
  private readonly _image: HTMLImageElement;

  constructor(public font: string) {
    this._canvas = document.createElement('canvas');
    // document.body.append(this._canvas);

    const context = this._canvas.getContext('2d');
    if (!context) throw new Error('No 2d context');
    this._context = context;

    this._image = document.createElement('img');
  }

  get context(): CanvasRenderingContext2D {
    const context = this._context;
    context.font = this.font;
    context.textBaseline = 'bottom';
    return context;
  }

  get width(): number {
    return this._canvas.width;
  }

  get height(): number {
    return this._canvas.height;
  }

  resize(width: number, height: number): Promise<void> {
    this._canvas.width = width;
    this._canvas.height = height;
    return new Promise<void>(resolve => setTimeout(resolve));
  }

  async loadImage(file: File): Promise<ImageLuminance> {
    const { _image, _context } = this;
    const dataUrl = await this.readImage(file);
    await this.updateImage(dataUrl);
    await this.resize(_image.width, _image.height);
    _context.drawImage(_image, 0, 0);
    const imageData = _context.getImageData(0, 0, _image.width, _image.height);
    return new ImageLuminance(dataUrl, imageData);
  }

  private readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onloadend = () => {
        const result = fileReader.result;
        if (typeof result === 'string') resolve(result);
        else reject('Invalid result type ' + (typeof result));
      };
      fileReader.onerror = e => reject(e);
      fileReader.readAsDataURL(file);
    });
  }

  private async updateImage(dataUrl: string): Promise<void> {
    this._image.src = dataUrl;
    new Promise<void>(resolve => setTimeout(resolve));
  }
}