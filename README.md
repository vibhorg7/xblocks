This is git repository for Xblocks Inframind S3

Instruction to install:

1. Install following components:
    
    npm install -g composer-cli
    npm install -g composer-rest-server
    npm install -g generator-hyperledger-composer
    npm install -g yo
 
 2. Install composer-playground
    
    npm install -g composer-playground
    
 3. Install Hyperledger Fabric
 
    mkdir ~/fabric-dev-servers && cd ~/fabric-dev-servers  
    curl -O https://raw.githubusercontent.com/hyperledger/composer-tools/master/packages/fabric-dev-servers/fabric-dev-servers.tar.gz
    tar -xvf fabric-dev-servers.tar.gz
    
  4. cd into hyperledger fabric
      
       cd ~/fabric-dev-servers
        ./downloadFabric.sh
        
  5. Start network and install peerAdminCard
  
    ./startFabric.sh
    ./createPeerAdminCard.sh
    
  6. Start Composer Playground
  
    composer-playground
    
    This will typically open your browser to hhttp://localhost:8080/login
    
  7. Copy Assets, Participamts and all other files in respective files in playground.
                                          
                                          or
                                          
   Create BNA file and upload to playground
   
   8. Run Application
