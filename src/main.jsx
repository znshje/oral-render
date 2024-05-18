import FileDragDropPlugin from "@/components/plugins/FildDragDropPlugin.jsx";
import ControlPanel from "@/pages/multi-render/control-panel/page.jsx";
import MultiRender from "@/pages/multi-render/page.jsx";
import Render from "@/pages/render/page.jsx";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import './globals.css';
import Index from './pages/index/page.jsx';
import MultiRenderHack from "./pages/multi-render-hack/page.jsx";
import StoreProvider from "./StoreProvider.jsx";

const route = createBrowserRouter([
    {
        path: '/',
        element: <Index/>
    },
    {
        path: '/render',
        element: <Render/>
    },
    {
        path: '/multi-render',
        element: <MultiRender/>
    },
    {
        path: '/multi-render/control-panel',
        element: <ControlPanel/>
    },
    {
        path: '/multi-render/hack',
        element: <MultiRenderHack/>
    },
])

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <StoreProvider>
            <Theme>
                <RouterProvider router={route}/>
                <FileDragDropPlugin/>
            </Theme>
        </StoreProvider>
    </React.StrictMode>,
);
