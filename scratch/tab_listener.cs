using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

class TabListener {
    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out POINT lpPoint);

    static void Main() {
        bool lastState = false;
        long lastArrowTick = 0;
        
        bool isLButtonDown = false;
        bool isCalibrating = false;
        POINT lastMousePos = new POINT();
        
        IntPtr lastHwnd = IntPtr.Zero;
        bool lastIsLolActive = false;
        
        while (true) {
            IntPtr hwnd = GetForegroundWindow();
            if (hwnd != IntPtr.Zero) {
                bool isLolActive = false;
                if (hwnd == lastHwnd) {
                    isLolActive = lastIsLolActive;
                } else {
                    lastHwnd = hwnd;
                    try {
                        uint pid;
                        GetWindowThreadProcessId(hwnd, out pid);
                        if (pid != 0) {
                            using (System.Diagnostics.Process proc = System.Diagnostics.Process.GetProcessById((int)pid)) {
                                string procName = proc.ProcessName;
                                isLolActive = procName.Equals("League of Legends", StringComparison.OrdinalIgnoreCase);
                            }
                        }
                    } catch {
                        // Safe fallback if querying a privileged process
                    }
                    lastIsLolActive = isLolActive;
                }
                
                if (isLolActive) {
                    // TAB virtual key code is 0x09
                    bool isTabPressed = (GetAsyncKeyState(0x09) & 0x8000) != 0;
                    if (isTabPressed != lastState) {
                        lastState = isTabPressed;
                        Console.WriteLine(isTabPressed ? "DOWN" : "UP");
                        Console.Out.Flush();
                        
                        if (!isTabPressed) {
                            isLButtonDown = false;
                            if (isCalibrating) {
                                isCalibrating = false;
                                Console.WriteLine("CALIBRATION_OFF");
                                Console.Out.Flush();
                            }
                        }
                    }

                    if (isTabPressed) {
                        // Check if CTRL (VK_CONTROL = 0x11) is also held down
                        bool ctrlCurrent = (GetAsyncKeyState(0x11) & 0x8000) != 0;
                        if (ctrlCurrent != isCalibrating) {
                            isCalibrating = ctrlCurrent;
                            Console.WriteLine(isCalibrating ? "CALIBRATION_ON" : "CALIBRATION_OFF");
                            Console.Out.Flush();
                        }

                        // Only track automatic drag if NOT in calibration mode
                        if (!isCalibrating) {
                            // Check if left mouse button (VK_LBUTTON = 0x01) is held down (for scoreboard dragging)
                            bool lButtonCurrent = (GetAsyncKeyState(0x01) & 0x8000) != 0;
                            if (lButtonCurrent) {
                                POINT currentMousePos;
                                if (GetCursorPos(out currentMousePos)) {
                                    if (!isLButtonDown) {
                                        lastMousePos = currentMousePos;
                                        isLButtonDown = true;
                                    } else {
                                        int dx = currentMousePos.X - lastMousePos.X;
                                        int dy = currentMousePos.Y - lastMousePos.Y;
                                        if (dx != 0 || dy != 0) {
                                            Console.WriteLine("DRAG " + dx + " " + dy);
                                            Console.Out.Flush();
                                            lastMousePos = currentMousePos;
                                        }
                                    }
                                }
                            } else {
                                isLButtonDown = false;
                            }
                        }

                        // Check if CTRL + Arrow keys are used for keyboard fallback calibration
                        if (isCalibrating) {
                            // Check keys 0 to 5 to select active calibration element (0 = header, 1-5 = matchups rows)
                            for (int k = 0x30; k <= 0x35; k++) {
                                if ((GetAsyncKeyState(k) & 0x8000) != 0) {
                                    int num = k - 0x30;
                                    Console.WriteLine("SELECT " + num);
                                    Console.Out.Flush();
                                    Thread.Sleep(150); // Small debounce
                                    break;
                                }
                            }

                            long nowTicks = DateTime.UtcNow.Ticks;
                            long elapsedMs = (nowTicks - lastArrowTick) / 10000;
                            
                            if (elapsedMs > 100) { // 100ms calibration step interval
                                // Arrow Left (VK_LEFT = 0x25)
                                if ((GetAsyncKeyState(0x25) & 0x8000) != 0) {
                                    Console.WriteLine("CAL_LEFT");
                                    Console.Out.Flush();
                                    lastArrowTick = nowTicks;
                                }
                                // Arrow Up (VK_UP = 0x26)
                                else if ((GetAsyncKeyState(0x26) & 0x8000) != 0) {
                                    Console.WriteLine("CAL_UP");
                                    Console.Out.Flush();
                                    lastArrowTick = nowTicks;
                                }
                                // Arrow Right (VK_RIGHT = 0x27)
                                else if ((GetAsyncKeyState(0x27) & 0x8000) != 0) {
                                    Console.WriteLine("CAL_RIGHT");
                                    Console.Out.Flush();
                                    lastArrowTick = nowTicks;
                                }
                                // Arrow Down (VK_DOWN = 0x28)
                                else if ((GetAsyncKeyState(0x28) & 0x8000) != 0) {
                                    Console.WriteLine("CAL_DOWN");
                                    Console.Out.Flush();
                                    lastArrowTick = nowTicks;
                                }
                            }
                        }
                    }
                } else {
                    if (lastState) {
                        lastState = false;
                        isLButtonDown = false;
                        if (isCalibrating) {
                            isCalibrating = false;
                            Console.WriteLine("CALIBRATION_OFF");
                            Console.Out.Flush();
                        }
                        Console.WriteLine("UP");
                        Console.Out.Flush();
                    }
                }
            }
            Thread.Sleep(50); // 20 updates per second is extremely responsive and uses 0% CPU
        }
    }
}
