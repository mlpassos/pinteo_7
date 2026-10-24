"""Prévia local restrita ao protótipo, sem consulta de hostname do computador."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket


class PreviewServer(ThreadingHTTPServer):
    """Evita bloqueio de resolução reversa no início do servidor local."""

    def server_bind(self):
        """Abre somente o loopback sem consultar DNS."""
        socket.socket.bind(self.socket, self.server_address)
        self.server_name = "localhost"
        self.server_port = self.socket.getsockname()[1]


if __name__ == "__main__":
    handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).parent))
    with PreviewServer(("127.0.0.1", 8080), handler) as server:
        print("Prévia local: http://127.0.0.1:8080/", flush=True)
        server.serve_forever()
