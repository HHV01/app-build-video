using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

public class AudioSessionChecker {
    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator {
        int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr ppDevices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice {
        int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionManager2 {
        int GetAudioSessionControl(IntPtr AudioSessionGuid, int Priority, out IntPtr SessionControl);
        int GetSimpleAudioVolume(IntPtr AudioSessionGuid, int Priority, out IntPtr AudioVolume);
        int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
    }

    [Guid("E2F56580-970B-45A8-84E3-07C059978425"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionEnumerator {
        int GetCount(out int SessionCount);
        int GetSession(int SessionIndex, out IAudioSessionControl Session);
    }

    [Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionControl {
        int GetState(out int pRetVal);
        int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    }

    [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface ISimpleAudioVolume {
        int SetMasterVolume(float fLevel, ref Guid EventContext);
        int GetMasterVolume(out float pfLevel);
        int SetMute(bool bMute, ref Guid EventContext);
        int GetMute(out bool pbMute);
    }

    [Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionControl2 {
        int GetState(out int pRetVal);
        int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
        int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
        int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
        int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
        int GetGroupingParam(out Guid pRetVal);
        int SetGroupingParam(ref Guid Override, ref Guid EventContext);
        int RegisterAudioSessionNotification(IntPtr NewNotifications);
        int UnregisterAudioSessionNotification(IntPtr NewNotifications);
        int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
        int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
        int GetProcessId(out uint pRetVal);
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C45792914929")]
    public class MMDeviceEnumeratorComObject { }

    public static void Main() {
        try {
            Type mmType = Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C45792914929"));
            var enumerator = (IMMDeviceEnumerator)Activator.CreateInstance(mmType);
            IMMDevice device;
            enumerator.GetDefaultAudioEndpoint(0, 1, out device);
            Guid IID_IAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
            object o;
            device.Activate(ref IID_IAudioSessionManager2, 23, IntPtr.Zero, out o);
            var mgr = (IAudioSessionManager2)o;
            IAudioSessionEnumerator sessionEnum;
            mgr.GetSessionEnumerator(out sessionEnum);
            int count;
            sessionEnum.GetCount(out count);
            Console.WriteLine("==================================================");
            Console.WriteLine("System Audio Sessions Count: " + count);
            Console.WriteLine("==================================================");
            Guid empty = Guid.Empty;
            for (int i = 0; i < count; i++) {
                IAudioSessionControl ctl;
                sessionEnum.GetSession(i, out ctl);
                var ctl2 = ctl as IAudioSessionControl2;
                var vol = ctl as ISimpleAudioVolume;
                if (ctl2 != null && vol != null) {
                    uint pid;
                    ctl2.GetProcessId(out pid);
                    float volume;
                    vol.GetMasterVolume(out volume);
                    bool isMuted;
                    vol.GetMute(out isMuted);
                    string procName = "Unknown";
                    try {
                        var proc = Process.GetProcessById((int)pid);
                        procName = proc.ProcessName;
                    } catch {}

                    Console.WriteLine(string.Format("PID: {0,6} | Process: {1,-18} | Volume: {2,4:P0} | Muted: {3}", pid, procName, volume, isMuted));
                    if (isMuted) {
                        vol.SetMute(false, ref empty);
                        Console.WriteLine("   -> [Action] UNMUTED PID " + pid);
                    }
                    if (volume < 0.2f && (procName.ToLower().Contains("chrome") || procName.ToLower().Contains("edge") || procName.ToLower().Contains("brave") || procName.ToLower().Contains("opera") || procName.ToLower().Contains("browser"))) {
                        vol.SetMasterVolume(0.5f, ref empty);
                        Console.WriteLine("   -> [Action] RESTORED VOLUME to 50% for PID " + pid);
                    }
                }
            }
        } catch (Exception ex) {
            Console.WriteLine("Error checking audio sessions: " + ex.Message);
        }
    }
}
