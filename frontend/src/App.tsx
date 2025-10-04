import React from "react";
import Sidebar from "./components/Sidebar";
import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="bg-black text-stone-300 min-h-screen flex flex-col">
      <Sidebar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}