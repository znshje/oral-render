import React from "react";
import ReactDOM from "react-dom/client";
import Index from './pages/index/page.jsx'
import StoreProvider from "./StoreProvider.jsx";
import {Theme} from "@radix-ui/themes";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Render from "@/pages/render/page.jsx";
import MultiRender from "@/pages/multi-render/page.jsx";
import "@radix-ui/themes/styles.css";
import './globals.css'
import FileDragDropPlugin from "@/components/plugins/FildDragDropPlugin.jsx";
import ControlPanel from "@/pages/multi-render/control-panel/page.jsx";

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
    }
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
