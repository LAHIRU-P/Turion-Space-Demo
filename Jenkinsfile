pipeline {
  agent ec2-builder

  environment {
    DOCKERHUB_REPO = 'lahiru97/turion-space-demo'
    //Tag each buit image with last 7 of git hash
    IMAGE_TAG = "${env.GIT_COMMIT.take(7)}"
    //Text set by this enviroment variable is added to webapp page
    APP_MESSAGE = "Hello from Jenkins build #${env.BUILD_NUMBER}"
  }

  triggers { githubPush() }

  options { timestamps() }

  stages {
    stage('Git Checkout') {
      steps { checkout scm }
    }

    stage('Build Webapp Container') {
      steps {
        sh '''
          docker build -t $DOCKERHUB_REPO:$IMAGE_TAG .
        '''
      }
    }

    stage('Test Container') {
      steps {
        sh '''
          docker run -d --rm --name apptest -e APP_MESSAGE="$APP_MESSAGE" -p 8080:8080 $DOCKERHUB_REPO:$IMAGE_TAG
          # Wait for webapp to start before checking reported health
          sleep 2
          curl -fsS http://localhost:8080/healthz
          docker rm -f apptest
        '''
      }
    }

    stage('Push To Dockerhub') {
      when { not { branch 'PR-*' } } //Only push main branch builds to docker hub
      steps {
        withCredentials([usernamePassword(credentialsId: 'DockerHub-Credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push $DOCKERHUB_REPO:$IMAGE_TAG
          '''
        }
      }
    }
  }

  post {
    always { sh 'docker logout || true' }
  }
}