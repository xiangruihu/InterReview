interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleInitConfig) => void;
        renderButton: (element: HTMLElement | null, config: GoogleButtonConfig) => void;
        prompt: () => void;
      };
    };
  };
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
}

interface GoogleButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: string | number;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}
