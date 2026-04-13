/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Sidebar from './components/Sidebar';
import BuilderCanvas from './components/BuilderCanvas';

export default function App() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950">
      <Sidebar />
      <BuilderCanvas />
    </div>
  );
}

