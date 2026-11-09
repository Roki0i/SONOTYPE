import React from 'react';
import {createRoot} from 'react-dom/client';
import {StudioShell} from './StudioShell';
import './style.css';

const el=document.getElementById('root');
if(!el)throw Error('Missing root element');
createRoot(el).render(<React.StrictMode><StudioShell/></React.StrictMode>);
