import { env, server } from "./src/server.js";
import { connectDB } from "./src/utils.js";

// HTML form endpoint
server.get('/test', (req, res) => {
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Image Upload Test</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  max-width: 800px;
                  margin: 20px auto;
                  padding: 0 20px;
              }
              .upload-form {
                  border: 2px dashed #ccc;
                  padding: 20px;
                  border-radius: 8px;
                  margin-bottom: 20px;
              }
              .preview-container {
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                  gap: 10px;
                  margin-top: 20px;
              }
              .preview-image {
                  width: 100%;
                  height: 150px;
                  object-fit: cover;
                  border-radius: 4px;
              }
              .response {
                  background: #f5f5f5;
                  padding: 15px;
                  border-radius: 4px;
                  margin-top: 20px;
                  white-space: pre-wrap;
              }
              .error {
                  color: red;
                  margin-top: 10px;
              }
          </style>
      </head>
      <body>
          <h1>Image Upload Test</h1>
          <div class="upload-form">
              <form id="uploadForm">
                  <input type="file" name="images" multiple accept="image/*">
                  <button type="submit">Upload</button>
              </form>
              <div id="error" class="error"></div>
              <div id="preview" class="preview-container"></div>
              <div id="response" class="response" style="display: none;"></div>
          </div>

          <script>
              const form = document.getElementById('uploadForm');
              const preview = document.getElementById('preview');
              const error = document.getElementById('error');
              const response = document.getElementById('response');

              // Preview images
              form.images.addEventListener('change', function(e) {
                  preview.innerHTML = '';
                  error.textContent = '';
                  
                  if (this.files.length > 5) {
                      error.textContent = 'Maximum 5 files allowed';
                      this.value = '';
                      return;
                  }

                  for (let file of this.files) {
                      if (file.size > 5 * 1024 * 1024) {
                          error.textContent = 'Each file must be less than 5MB';
                          this.value = '';
                          preview.innerHTML = '';
                          return;
                      }

                      const reader = new FileReader();
                      reader.onload = function(e) {
                          const img = document.createElement('img');
                          img.src = e.target.result;
                          img.className = 'preview-image';
                          preview.appendChild(img);
                      }
                      reader.readAsDataURL(file);
                  }
              });

              // Handle form submission
              form.addEventListener('submit', async function(e) {
                  e.preventDefault();
                  error.textContent = '';
                  response.style.display = 'none';

                  const formData = new FormData(this);

                  try {
                      const res = await fetch('/api/v1/upload', {
                          method: 'POST',
                          body: formData
                      });

                      const data = await res.json();
                      response.textContent = JSON.stringify(data, null, 2);
                      response.style.display = 'block';

                      if (!res.ok) {
                          throw new Error(data.message || 'Upload failed');
                      }
                  } catch (err) {
                      error.textContent = err.message;
                  }
              });
          </script>
      </body>
      </html>
  `;
  res.send(html);
});

(async () => {
  await connectDB(env.parsed);
  const port = process.env.PORT || 1234;
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})();
