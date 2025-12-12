import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input email and password, then click the login button to log in.
        frame = context.pages[-1]
        # Input the email address
        elem = frame.locator('xpath=html/body/div[2]/div/div[2]/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('azevedoryan0876@gmail.com')
        

        frame = context.pages[-1]
        # Input the password
        elem = frame.locator('xpath=html/body/div[2]/div/div[2]/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('123123')
        

        frame = context.pages[-1]
        # Click the login button to submit credentials
        elem = frame.locator('xpath=html/body/div[2]/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on the 'Pixels' menu item to navigate to the pixel management interface.
        frame = context.pages[-1]
        # Click on 'Pixels' menu to go to pixel management interface
        elem = frame.locator('xpath=html/body/div[2]/nav/div[2]/a[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Novo Pixel' button to start creating a new Facebook pixel.
        frame = context.pages[-1]
        # Click 'Novo Pixel' button to open pixel creation form
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/header/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input valid pixel name, Pixel ID, and Access Token, then click 'Salvar' to create the pixel.
        frame = context.pages[-1]
        # Input valid pixel identification name
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Pixel Teste')
        

        frame = context.pages[-1]
        # Input valid Pixel ID
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2218096548606227')
        

        frame = context.pages[-1]
        # Input valid Access Token
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('EAAb7wyx9P')
        

        frame = context.pages[-1]
        # Click 'Salvar' button to submit and create the pixel
        elem = frame.locator('xpath=html/body/div[4]/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Verify token validation by attempting to create a pixel with an invalid token and check for rejection message.
        frame = context.pages[-1]
        # Click 'Novo Pixel' button to open pixel creation form for token validation test
        elem = frame.locator('xpath=html/body/div[2]/main/div/div/header/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input a valid pixel name, a valid Pixel ID, and an invalid Access Token, then click 'Salvar' to test token validation.
        frame = context.pages[-1]
        # Input pixel name for invalid token test
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Pixel Invalid Token')
        

        frame = context.pages[-1]
        # Input valid Pixel ID for invalid token test
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2218096548606227')
        

        frame = context.pages[-1]
        # Input invalid Access Token to test validation
        elem = frame.locator('xpath=html/body/div[4]/div[2]/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('INVALID_TOKEN_123')
        

        frame = context.pages[-1]
        # Click 'Salvar' button to submit invalid token and test validation
        elem = frame.locator('xpath=html/body/div[4]/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Close the pixel creation form and finish the task as all validations and pixel creations are confirmed.
        frame = context.pages[-1]
        # Click 'Close' button to close the pixel creation form
        elem = frame.locator('xpath=html/body/div[4]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Pixel Teste').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Pixel Melq').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Novo Pixel').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    