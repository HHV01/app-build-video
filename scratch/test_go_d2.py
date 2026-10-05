import time
import ctypes
from pyvda import VirtualDesktop, get_virtual_desktops
from PIL import ImageGrab

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('WinSta0', False, 0x037F)
user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(h_desk)

print("Switching to Desktop 2...")
d2 = VirtualDesktop(2)
d2.go()
time.sleep(1)

# Grab screenshot
im = ImageGrab.grab(all_screens=True)
im.save("scratch/view_desktop_2.png")
print("Saved screenshot of Desktop 2!")
