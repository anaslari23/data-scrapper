// Simple toast helper to avoid circular imports from component files.
// We'll wire this to the shadcn toast system in App.tsx via a ref approach.

type ToastFn = (msg: string) => void;

let _error: ToastFn = (msg) => console.error('[toast]', msg);
let _success: ToastFn = (msg) => console.log('[toast]', msg);
let _info: ToastFn = (msg) => console.info('[toast]', msg);

export function registerToast(fns: { error: ToastFn; success: ToastFn; info: ToastFn }) {
  _error = fns.error;
  _success = fns.success;
  _info = fns.info;
}

const toast = {
  error: (msg: string) => _error(msg),
  success: (msg: string) => _success(msg),
  info: (msg: string) => _info(msg),
};

export default toast;
