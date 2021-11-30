import React, { ChangeEvent, Component, DragEvent, ReactElement, RefObject, SyntheticEvent } from 'react';
import ReactDOM from 'react-dom';
import { ImageLuminance } from './ImageLuminance';
import { Palette } from './Palette';
import { Canvas } from './Canvas';

const ACCEPT_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/bmp'
].join(', ');

interface WAAGState {
  ready: boolean,
  cols: { value: number, override: boolean },
  rows: { value: number, override: boolean },
  fontSize: number;
  preserveAspect: boolean,
  symbols: string,
  art?: string
}

class WAAG extends Component<any, WAAGState> {
  private readonly canvas: Canvas;
  private readonly _artAreaRef = React.createRef<HTMLTextAreaElement>();
  private readonly resizeObserver: ResizeObserver;
  private readonly textAreaScale = [0, 0];
  private _resizing = false;
  private _palette?: Palette;
  private _image?: ImageLuminance;

  private _generatePromise?: Promise<void>;

  constructor(props: any) {
    super(props);
    const symbols = ' .:-=+*#%@';
    this.state = {
      symbols: symbols,
      fontSize: 8,
      cols: { value: 80, override: false },
      rows: { value: 40, override: false },
      preserveAspect: true,
      ready: true,
      art: undefined // ('X'.repeat(40) + '\n').repeat(39) + 'X'.repeat(40)
    };
    this.canvas = new Canvas(this.font);
    this.resizeObserver = new ResizeObserver(this.artAreaResized.bind(this));
  }

  render(): ReactElement {
    const { cols, rows, symbols, ready, art, preserveAspect, fontSize } = this.state;
    const image = this._image;
    return <>
        <div className='fields'>
          <div className='field image'>
            <label>Image</label>
            <input type='file' id='image' name='image' className='hidden' accept={ACCEPT_TYPES}
                   onChange={e => this.updateFile(e)}
                   disabled={!ready} />
            <label htmlFor='image'>
              <img alt='drop image' src={image?.dataUrl || './drop-image.png'}
                   onDragOver={e => this.dragOver(e)}
                   onDrop={e => this.updateFile(e)} />
            </label>
          </div>

          <div className='field cols'>
            <label>Columns</label>
            <input type='checkbox' checked={cols.override} onChange={e => this.updateOverride(e, 'cols')} />
            <input type='number' value={cols.value} onChange={e => this.updateColumns(e)} disabled={!cols.override} />
          </div>

          <div className='field cols'>
            <label>Rows</label>
            <input type='checkbox' checked={rows.override} onChange={e => this.updateOverride(e, 'rows')} />
            <input type='number' value={rows.value} onChange={e => this.updateRows(e)} disabled={!rows.override} />
          </div>

          <div className='field aspect'>
            <label>Preserve aspect</label>
            <input type='checkbox' checked={preserveAspect} onChange={e => this.updatePreserveAspect(e)} />
          </div>

          <div className='field palette'>
            <label>Palette</label>
            <input type='text' value={symbols} onChange={e => this.updatePalette(e)}
                   disabled={!ready} />
          </div>
        </div>

        <input type='button' disabled={!image || !ready} value='Generate' onClick={() => this.generate()} />
        <hr />

        <div className='art'>
          <textarea value={art} rows={rows.value} cols={cols.value} ref={this._artAreaRef}
                    style={{ fontFamily: 'monospace', fontSize: fontSize }}
                    onDragOver={e => this.dragOver(e)}
                    onDrop={e => this.updateFile(e)}
          />
        </div>
    </>;
  }

  componentDidMount(): void {
    const artArea = safeElement(this._artAreaRef);
    const scale = this.textAreaScale;
    scale[0] = artArea.clientWidth / artArea.cols;
    scale[1] = artArea.clientHeight / artArea.rows;
    this.resizeObserver.observe(artArea);
  }

  private get ready(): boolean {
    return this.state.ready;
  }

  private get font(): string {
    return this.state.fontSize + 'px monospace';
  }

  private updatePalette(e: ChangeEvent<HTMLInputElement>): void {
    this._palette = undefined;
    this.setState({ symbols: e.target.value }, () => this.generate());
  }

  private updateColumns(e: ChangeEvent<HTMLInputElement>): void {
    const value = e.target.valueAsNumber;
    this.setState({ cols: { value: value, override: true } }, () => this.generate());
  }

  private updateRows(e: ChangeEvent<HTMLInputElement>): void {
    const value = e.target.valueAsNumber;
    this.setState({ rows: { value: value, override: true } }, () => this.generate());
  }

  private updateOverride(e: ChangeEvent<HTMLInputElement>, prop: 'cols' | 'rows'): void {
    const override = e.target.checked;
    this.setState(current => {
      const res = { ...current };
      res[prop] = { ...current[prop], override: override };
      return res;
    }, () => this.generate());

  }

  private updatePreserveAspect(e: ChangeEvent<HTMLInputElement>): void {
    const value = e.target.checked;
    this.setState({ preserveAspect: value }, () => this.generate());
  }

  private dragOver(e: DragEvent<HTMLImageElement | HTMLTextAreaElement>): void {
    const dataTransfer = e.dataTransfer;
    const item = dataTransfer.items[0];
    if (this.acceptItem(item)) {
      e.dataTransfer.effectAllowed = e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.effectAllowed = e.dataTransfer.dropEffect = 'none';
    }
    e.stopPropagation();
    e.preventDefault();
  }

  private async updateFile(e: ChangeEvent<HTMLInputElement> | DragEvent<HTMLImageElement | HTMLTextAreaElement>): Promise<void> {
    if (!this.ready) return;
    let file;
    if (isChangeEvent(e) && e.target.files) {
      file = e.target.files[0];
    } else if (isDragEvent(e)) {
      e.preventDefault();
      const item = e.dataTransfer.items[0];
      if (this.acceptItem(item)) file = item.getAsFile();
    }
    if (file) {
      this._image = await this.canvas.loadImage(file);
      this.generate();
    }
  }

  private artAreaResized(e: ResizeObserverEntry[]): void {
    const textArea = safeElement(this._artAreaRef);
    if (!this._resizing && e.length > 0 && e[0].target === textArea && (!this.state.cols.override || !this.state.rows.override)) {
      const size = this.artAreaSize();
      let updated = false;
      this.setState(current => {
          const res = { ...current };
          if (!current.cols.override && size[0] !== current.cols.value) res.cols = { override: false, value: size[0] };
          if (!current.rows.override && size[1] !== current.rows.value) res.rows = { override: false, value: size[1] };
          updated = current.cols !== res.cols || current.rows !== res.rows;
        }, () => {
          this._resizing = false;
        if (updated) this.generate();
        }
      );
    }
  }

  private artAreaSize(): [number, number] {
    const artArea = safeElement(this._artAreaRef);
    const cols = Math.floor(artArea.clientWidth / this.textAreaScale[0]);
    const rows = Math.floor(artArea.clientHeight / this.textAreaScale[1]);
    return [cols, rows];
  }

  private generate(): void {
    if (this._generatePromise) {
      this._generatePromise.then(() => this.generate());
      return;
    }

    const { preserveAspect, cols, rows, ready } = this.state;
    const image = this._image;
    if (!ready || !image) return;

    this.setState({ ready: false });
    const size = this.artAreaSize();
    if (cols.override) size[0] = cols.value;
    if (rows.override) size[1] = rows.value;
    const { width, height } = image;
    if (preserveAspect) {
      const ar = width / height;
      if (!rows.override && !cols.override) {
        if (size[1] * ar > size[0]) {
          size[1] = Math.floor(size[0] / ar);
        } else if (size[0] / ar > size[1] && !cols.override) {
          size[0] = Math.floor(size[1] * ar);
        }
      } else if (rows.override) {
        size[0] = Math.floor(size[1] * ar);
      } else if (cols.override) {
        size[1] = Math.floor(size[0] / ar);
      }
    }

    this._generatePromise = this.getPalette().then(palette => {
      const art = generate(image, palette, size);
      this.setState({
        art: art,
        ready: true,
        cols: { ...cols, value: size[0] },
        rows: { ...rows, value: size[1] }
      });
      this._generatePromise = undefined;
    });
  }

  private async getPalette(): Promise<Palette> {
    if (this._palette) return this._palette;
    return this._palette = await Palette.create(this.state.symbols, this.canvas);
  }

  private acceptItem(item: DataTransferItem) {
    return item.kind === 'file' && item.type.startsWith('image/');
  }
}

function isChangeEvent(e: SyntheticEvent): e is ChangeEvent {
  return e.type === 'change';
}

function isDragEvent(e: SyntheticEvent): e is DragEvent {
  return !!(e as Partial<DragEvent>).dataTransfer;
}

function generate(image: ImageLuminance, palette: Palette, size: [number, number]): string {
  const { width, height } = image;
  const [cols, rows] = size;

  const rect = { x: 0, y: 0, width: width / cols, height: height / rows };
  let art = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const l = image.average(rect);
      art += palette.closest(l);
      rect.x += rect.width;
    }
    rect.x = 0;
    rect.y += rect.height;
    if (y < rows - 1)
      art += '\n';
  }
  return art;
}

function safeElement<T extends Element>(e: RefObject<T>): T {
  if (e.current) return e.current;
  throw new Error('No element');
}

ReactDOM.render(<WAAG />, document.getElementById('waag'));

