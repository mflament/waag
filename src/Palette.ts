import { Canvas } from './Canvas';
import { ImageLuminance } from './ImageLuminance';

export class Palette {
  private constructor(private readonly sortedSymbols: string[],
                      private readonly sortedLuminance: Float32Array) {
  }

  closest(l: number): string {
    const { sortedSymbols, sortedLuminance } = this;
    for (let i = 0; i < sortedSymbols.length; i++) {
      const cl = sortedLuminance[i];
      if (l <= cl) {
        if (i > 0) {
          const pl = sortedLuminance[i - 1];
          if (Math.abs(l - cl) < Math.abs(l - pl)) return sortedSymbols[i];
          return sortedSymbols[i - 1];
        }
        return sortedSymbols[i];
      }
    }
    return sortedSymbols[sortedSymbols.length - 1];
  }

  static async create(symbols: string, canvas: Canvas): Promise<Palette> {
    const tuples: [string, number][] = [];
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < symbols.length; i++) {
      const char = symbols.charAt(i);
      const l = await Palette.symbolLuminance(char, canvas);
      tuples.push([char, l]);
      min = Math.min(min, l);
      max = Math.max(max, l);
    }
    for (let i = 0; i < tuples.length; i++) {
      tuples[i][1] = (tuples[i][1] - min) / (max - min);
    }

    tuples.sort((a, b) => a[1] - b[1]);
    const sortedSymbols = new Array(tuples.length);
    const sortedLuminance = new Float32Array(tuples.length);
    tuples.forEach((t, i) => {
      sortedSymbols[i] = t[0];
      sortedLuminance[i] = t[1];
    });
    console.debug(sortedSymbols.map((s, i) => s + ':' + sortedLuminance[i].toFixed(3)));
    return new Palette(sortedSymbols, sortedLuminance);
  }

  private static async symbolLuminance(symbol: string, canvas: Canvas): Promise<number> {
    const tm = canvas.context.measureText(symbol);
    const width = Math.ceil(tm.width);
    const height = Math.ceil(Math.abs(Math.abs(tm.actualBoundingBoxDescent) + tm.actualBoundingBoxAscent));
    await canvas.resize(width, height);

    const context = canvas.context;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000';
    context.fillText(symbol, 0, canvas.height);
    const imageLuminance = new ImageLuminance('', context.getImageData(0, 0, canvas.width, canvas.height));

    return imageLuminance.average();
  }
}