"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
var react_query_1 = require("@tanstack/react-query");
var react_router_dom_1 = require("react-router-dom");
require("./lib/i18n");
var query_client_1 = require("./lib/query-client");
var router_1 = require("./router");
require("./index.css");
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
    <react_query_1.QueryClientProvider client={query_client_1.queryClient}>
      <react_router_dom_1.RouterProvider router={router_1.router}/>
    </react_query_1.QueryClientProvider>
  </react_1.default.StrictMode>);
