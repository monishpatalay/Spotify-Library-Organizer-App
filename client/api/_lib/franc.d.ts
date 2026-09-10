// franc@5 ships no type declarations and has no @types package.
declare module 'franc' {
  const franc: (text: string, opts?: { minLength?: number }) => string;
  export default franc;
}
