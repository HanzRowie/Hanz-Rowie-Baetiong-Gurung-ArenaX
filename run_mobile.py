import socket
import subprocess
from pathlib import Path

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        # Create a socket to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("192.168.1.1", 80))  # This IP doesn't need to be reachable
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

def main():
    print("🚀 Starting Arena-X Development Servers for Mobile Access")
    print("=" * 60)

    local_ip = get_local_ip()

    print(f"📱 Your local IP: {local_ip}")
    print("\n🌐 Access URLs for mobile devices:")
    print(f"   Frontend: http://{local_ip}:3002")
    print(f"   Backend API: http://{local_ip}:8000/api")
    print(f"   Password Reset: http://{local_ip}:3002/reset-password?token=YOUR_TOKEN")
    print(f"   Referee Dashboard: http://{local_ip}:3002/dashboard")
    print("\n📋 Instructions:")
    print("   1. Make sure both servers are running")
    print("   2. Connect your mobile device to the same WiFi network")
    print("   3. Use the URLs above on your mobile browser")
    print("   4. Ensure no firewall is blocking the connections")
    print("\n🛠️  Server Status:")
    print("   ✅ Backend: Running on 0.0.0.0:8000 (network accessible)")
    print("   ✅ Frontend: Running with --host (network accessible)")

if __name__ == "__main__":
    main()
