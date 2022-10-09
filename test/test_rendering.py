import sys
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from webdriver_manager.firefox import GeckoDriverManager as DriverManager

from servers import ServerModes

o = Options()
o.headless = True
driver = webdriver.Firefox(executable_path=DriverManager().install(), options=o)
driver.set_window_size(1920, 1080)
driver.implicitly_wait(1.0)
print("Driver ready!")
out = Path("out")
out.mkdir(exist_ok=True)

for Server in ServerModes:
    print("Starting server %s" % Server.__name__)
    srv = Server(driver)
    try:
        srv.start_server()
        print("Server started!")
        for file in sys.argv[1:]:
            print("Loading file %s" % file)
            file = Path(file)
            assert file.is_file()
            for nr, elem in enumerate(srv.load_notebook(file), 1):
                svg = elem.find_element(By.TAG_NAME, "svg")
                svg.screenshot(out / f"{Server.__name__}-{file.stem}-{nr}.png")
    except:
        with open(out / f"{Server.__name__}-error.html", "wt") as f:
            f.write(driver.page_source)
        driver.save_screenshot(out / f"{Server.__name__}-error.png")
        raise
    finally:
        print("Stopping server")
        srv.stop_server()
driver.close()
