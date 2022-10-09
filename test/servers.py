import errno
import time
from typing import Iterable
from urllib.parse import urljoin

import attr
import sh
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.wait import WebDriverWait


@attr.s()
class ServerMode(object):
    driver: WebDriver = attr.ib(repr=False)
    # see https://selenium-python.readthedocs.io/api.html
    timeout: float = attr.ib(default=5)
    base_url: str = attr.ib(default=None)
    cmd: sh.RunningCommand = attr.ib(default=None)
    # see https://amoffat.github.io/sh/index.html

    def start_server(self) -> None:
        pass

    def load_notebook(self, path: str) -> Iterable[WebElement]:
        pass

    def stop_server(self):
        self.cmd.terminate()
        for _ in range(10):
            if not self.cmd.is_alive():
                break
            time.sleep(0.1)
        if self.cmd.is_alive():
            self.cmd.kill()
        try:
            self.read_all()
        except sh.SignalException:
            pass

    def wait_for_start_url(self):
        url = None
        start = time.time()
        for line in self.cmd:
            if line == errno.EWOULDBLOCK:
                # see the url and the `_iter_noblock` calls to `sh` below for how this iterator works
                # https://amoffat.github.io/sh/sections/asynchronous_execution.html
                if url:
                    break
                else:
                    if time.time() - start > self.timeout:
                        raise TimeoutError
                    time.sleep(0.1)
                    continue
            # print(line, end="")
            line = line.strip()
            if not url and (line.startswith("file:///") or line.startswith("http:///")):
                url = line
        if not url:
            raise RuntimeError("Could not start notebook!\n%s" % self.cmd.stdout)
        self.driver.get(url)
        self.wait.until(lambda _: not self.driver.current_url.startswith("file://"))
        return url

    def read_all(self):
        for line in self.cmd:
            if line == errno.EWOULDBLOCK:
                break
            # print(line, end="")

    @property
    def wait(self):
        return WebDriverWait(self.driver, timeout=self.timeout)
        # see https://www.selenium.dev/documentation/webdriver/waits/


class Notebook(ServerMode):
    def start_server(self) -> None:
        self.cmd = sh.jupyter.notebook("--no-browser", "--allow-root", "--VoilaConfiguration.enable_nbextensions=True", _iter_noblock=True, _err_to_out=True)
        self.wait_for_start_url()
        self.base_url = urljoin(self.driver.current_url, "/notebooks/")

    def load_notebook(self, path: str) -> Iterable[WebElement]:
        # see https://www.selenium.dev/documentation/webdriver/getting_started/first_script/
        self.driver.get("%s%s" % (self.base_url, path))
        i = self.driver.find_element(By.ID, "kernel_indicator_icon")
        self.wait.until(lambda _: i.get_attribute("class") == "kernel_idle_icon")
        self.driver.find_element(By.ID, "kernellink").click()
        self.driver.find_element(By.ID, "restart_run_all").click()
        self.driver.find_element(By.CSS_SELECTOR, ".modal-dialog .btn-danger").click()
        time.sleep(0.1)
        self.wait.until(lambda _: i.get_attribute("class") == "kernel_idle_icon")
        time.sleep(0.1)
        return self.driver.find_elements(By.CLASS_NAME, "output_subarea")


class NotebookVoila(Notebook):
    def start_server(self) -> None:
        super().start_server()
        self.base_url = urljoin(self.driver.current_url, "/voila/render/")

    def load_notebook(self, path: str) -> Iterable[WebElement]:
        self.driver.get("%s%s" % (self.base_url, path))
        return self.driver.find_elements(By.CLASS_NAME, "jp-OutputArea-output")


class JupyterLab(ServerMode):
    def start_server(self) -> None:
        self.cmd = sh.jupyter.lab("--no-browser", "--allow-root", _iter_noblock=True, _err_to_out=True)
        self.wait_for_start_url()
        self.base_url = urljoin(self.driver.current_url, "/lab/tree/")

    def load_notebook(self, path: str) -> Iterable[WebElement]:
        self.driver.get("%s%s" % (self.base_url, path))
        self.driver.find_element(By.CSS_SELECTOR, "button[data-command=\"runmenu:restart-and-run-all\"]").click()
        self.driver.find_element(By.CSS_SELECTOR, ".jp-Dialog .jp-mod-accept").click()
        return self.driver.find_elements(By.CLASS_NAME, "jp-OutputArea-output")


class Voila(ServerMode):
    def start_server(self) -> None:
        self.cmd = sh.voila("--no-browser", "--enable_nbextensions=True", _iter_noblock=True, _err_to_out=True)
        self.wait_for_start_url()
        self.base_url = urljoin(self.driver.current_url, "/voila/render/")

    def load_notebook(self, path: str) -> Iterable[WebElement]:
        self.driver.get("%s%s" % (self.base_url, path))
        return self.driver.find_elements(By.CLASS_NAME, "jp-OutputArea-output")


ServerModes = [Notebook, JupyterLab, Voila]
