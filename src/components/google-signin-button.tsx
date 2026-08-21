import { useEffect, useRef } from 'react';

// Minimal typing for the pieces of the Google Identity Services API we
// use. The real script (loaded in index.html) attaches `window.google`
// at runtime - it has no npm types package for this simplified surface.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'small' | 'medium' | 'large';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  /** Text shown on the button, e.g. "Continue with Google". */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  onToken: (idToken: string) => void;
  onError?: (message: string) => void;
};

/**
 * Renders Google's own "Continue with Google" button via Google Identity
 * Services (the <script> tag is loaded once in index.html). On success it
 * hands the raw Google ID token up to the caller, which sends it to
 * POST /api/auth/google to be verified and exchanged for our own session
 * token - the button itself never talks to our backend.
 */
export function GoogleSignInButton({ text = 'continue_with', onToken, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return;
    }

    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.google) {
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onToken(response.credential);
          } else {
            onError?.('Google sign-in did not return a token. Please try again.');
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'pill',
        width: 360,
      });
    };

    // The GSI script loads asynchronously (async/defer in index.html), so
    // it may not be ready yet on first mount - poll briefly until it is.
    if (window.google) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [text, onToken, onError]);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
