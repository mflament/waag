import typescript from 'rollup-plugin-typescript2';
import eslint from '@rollup/plugin-eslint';
import externalGlobals from 'rollup-plugin-external-globals';
import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: ['./src/index.tsx'],
    external: ['react', 'react-dom'],
    output: {
      dir: 'dist',
      format: 'esm',
      sourcemap: false,
      plugins: [terser()]
    },
    plugins: [
      eslint(),
      typescript(),
      externalGlobals({
        'react': 'React',
        'react-dom': 'ReactDOM'
      })
    ]
  }
];
