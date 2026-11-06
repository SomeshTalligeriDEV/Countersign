# Reuse the reviewed API image build; run the attestor in its own process/container.
# Build the image: docker build -f apps/api/Dockerfile -t countersign-runtime .
FROM countersign-runtime
CMD ["node", "apps/attestor/src/server.mjs"]
