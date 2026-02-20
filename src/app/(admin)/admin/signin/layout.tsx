// This is the LoginLayout that you want to use exclusively for login pages

import React, { FC } from 'react';

interface Props {
  children: React.ReactNode;
}

const LoginLayout: FC<Props> = ({ children }) => {
  return (
  
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{  padding: '20px', border: '1px solid rgb(255 255 255 / 0.2)', borderRadius: '8px', position: 'relative' }}>
        {children}
      </div>
    </div>
  
  );
};

export default LoginLayout;
