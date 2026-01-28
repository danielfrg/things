repomix-web:
    repomix packages/web --copy --ignore "packages/cli/**,**/drizzle/meta/**,**/generated/**,scripts/*"
    rm repomix-output.md 


repomix-cli:
    repomix packages/cli --copy --ignore "packages/web/**"
    rm repomix-output.md 


repomix-all:
    repomix --copy --ignore "**/drizzle/meta/**,**/generated/**"
    rm repomix-output.md 


image:
    docker build -t things .


docker-run:
    docker run -it -p 3000:3000 -e BETTER_AUTH_SECRET=12345 -v $(pwd)/packages/web/data:/data things
