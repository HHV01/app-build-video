import ctypes
from ctypes import wintypes
import uuid
import winreg

# Get Desktop 2 ID from registry
key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Explorer\VirtualDesktops')
val, _ = winreg.QueryValueEx(key, 'VirtualDesktopIDs')
desktop2_bytes = val[16:32]
desktop2_id = uuid.UUID(bytes_le=desktop2_bytes)
print("Desktop 2 GUID:", desktop2_id)

ole32 = ctypes.windll.ole32
ole32.CoInitialize(None)

class GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", wintypes.DWORD),
        ("Data2", wintypes.WORD),
        ("Data3", wintypes.WORD),
        ("Data4", ctypes.c_byte * 8)
    ]

def uuid_to_guid(u):
    g = GUID()
    b = u.bytes_le
    g.Data1 = int.from_bytes(b[0:4], 'little')
    g.Data2 = int.from_bytes(b[4:6], 'little')
    g.Data3 = int.from_bytes(b[6:8], 'little')
    for i in range(8):
        g.Data4[i] = b[8+i]
    return g

CLSID_VirtualDesktopManager = uuid_to_guid(uuid.UUID('{aa509085-7ee9-46c3-9726-ac96e320e164}'))
IID_IVirtualDesktopManager = uuid_to_guid(uuid.UUID('{a5cd92dd-01e0-4c49-91b4-8388d227f3b0}'))

p_vdm = ctypes.c_void_p()
hr = ole32.CoCreateInstance(
    ctypes.byref(CLSID_VirtualDesktopManager),
    None,
    1, # CLSCTX_INPROC_SERVER
    ctypes.byref(IID_IVirtualDesktopManager),
    ctypes.byref(p_vdm)
)
print("CoCreateInstance hr:", hex(hr if hr >= 0 else (1 << 32) + hr), "Pointer:", p_vdm.value)

if hr == 0 and p_vdm.value:
    # VTable definition
    # VTable[3] = IsWindowOnCurrentVirtualDesktop
    # VTable[4] = GetWindowDesktopId
    # VTable[5] = MoveWindowToDesktop
    vtable = ctypes.cast(p_vdm, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
    MoveWindowToDesktop_ptr = vtable[5]
    
    proto = ctypes.WINFUNCTYPE(
        wintypes.HRESULT,
        ctypes.c_void_p,
        wintypes.HWND,
        ctypes.POINTER(GUID)
    )
    MoveWindowToDesktop = proto(MoveWindowToDesktop_ptr)
    
    guid_d2 = uuid_to_guid(desktop2_id)
    print("MoveWindowToDesktop function pointer loaded successfully!")
