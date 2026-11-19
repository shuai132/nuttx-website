/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

function create_terminal(cols, rows, font_size, on_input, on_resize)
{
    var container = document.getElementById("term_container");
    var encoder = new TextEncoder();
    var terminal = new Terminal({
        cols: cols,
        rows: rows,
        scrollback: 10000,
        fontSize: font_size,
        fontFamily: "'JetBrains Mono', monospace",
        cursorBlink: true,
        screenReaderMode: true,
        theme: { background: "#000000", foreground: "#f0f0f0", cursor: "#00ff00" }
    });
    var fit = new FitAddon.FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container);

    /* The emulator's console accepts and emits bytes, not Unicode strings. */
    terminal.onData(function(data) {
        var bytes = encoder.encode(data);
        var binary = "";
        for (var i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
        on_input(binary);
    });
    terminal.onResize(on_resize);

    /* Keep native copy/paste shortcuts, but retain Ctrl+C to interrupt tasks. */
    terminal.attachCustomKeyEventHandler(function(event) {
        var key = event.key.toLowerCase();
        if ((event.ctrlKey || event.metaKey) &&
            (key === "v" || (key === "c" && terminal.hasSelection())))
            return false;
        return true;
    });

    /* Contain scrolling even at the beginning/end of the scrollback buffer. */
    container.addEventListener("wheel", function(event) {
        if (!event.ctrlKey)
            event.preventDefault();
        event.stopPropagation();
    }, { passive: false });

    var pending_frame;
    function schedule_fit() {
        cancelAnimationFrame(pending_frame);
        pending_frame = requestAnimationFrame(function() { fit.fit(); });
    }
    var observer = new ResizeObserver(schedule_fit);
    observer.observe(container);
    if (document.fonts)
        document.fonts.ready.then(schedule_fit);
    fit.fit();
    terminal.focus();

    return {
        getSize: function() { return [terminal.cols, terminal.rows]; },
        write: function(binary) {
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++)
                bytes[i] = binary.charCodeAt(i);
            terminal.write(bytes);
        },
        writeln: function(text) { terminal.writeln(text); }
    };
}
