pipeline {
    agent any

    environment {
        STACK_NAME = "sipeta"
        PROJECT_DIR = "/var/jenkins_home/workspace/SIPETA"
    }

    stages {

        stage('Clone Repository') {
            steps {
                git branch: 'main',
                url: 'https://github.com/Addam884/SIPETA_WEB'
            }
        }

        stage('Build Backend Image') {
            steps {
                sh '''
                docker build -t sipeta-backend:latest ./sipeta-backend
                '''
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh '''
                docker build -t sipeta-frontend:latest ./sipeta-frontend
                '''
            }
        }

        stage('Deploy Docker Swarm') {
            steps {
                sh '''
                docker stack deploy -c docker-compose.yml sipeta
                '''
            }
        }

        stage('Verify Services') {
            steps {
                sh '''
                docker service ls
                '''
            }
        }
    }

    post {

        success {
            echo 'SIPETA deployed successfully'
        }

        failure {
            echo 'Deploy failed'
        }
    }
}
