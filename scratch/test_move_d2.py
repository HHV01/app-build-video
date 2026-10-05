import ctypes
from ctypes import wintypes
import time
import subprocess

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('WinSta0', False, 0x037F)
user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

from pyvda import AppView, VirtualDesktop

d2 = VirtualDesktop(2)
print("Target Desktop:", d2.number, d2.id)

# Test finding a window and moving it
# Let's see how AppView(hwnd).move works
print("Testing AppView import and methods:")
print(dir(AppView))
