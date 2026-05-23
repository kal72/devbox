import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { Route } from '../../hooks/useHashRoute';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: Route;
}

export function Layout({ children, currentRoute }: LayoutProps) {
  return (
    <div className="layout-container">
      <Header />
      <div className="layout-body">
        <Sidebar currentRoute={currentRoute} />
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
